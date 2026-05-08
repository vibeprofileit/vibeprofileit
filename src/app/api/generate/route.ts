import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NSFW_KEYWORDS = ["nude", "nsfw", "naked", "explicit"];

const PONY_TRIGGERS = [
  "anime", "manga", "cartoon", "chibi", "waifu", "drawn", "comic",
  "illustration", "2d", "kawaii", "ghibli", "naruto", "demon",
  "jujutsu", "sakura", "illustrated",
];

const FLUX_TRIGGERS = [
  "photo", "realistic", "cinematic", "portrait", "photography",
  "hyperrealistic", "fantasy", "cyberpunk", "warrior", "dragon",
  "knight", "armor", "sci-fi", "dark", "epic",
];

// Verified via docs.siliconflow.cn (2026-05-08):
//   FLUX primary  → black-forest-labs/FLUX-1.1-pro-Ultra (up to 4 MP / 2K)
//   FLUX fallback → black-forest-labs/FLUX.1-pro  (if primary returns 400 "Model does not exist")
//   Pony          → Kwai-Kolors/Kolors (anime-capable; no dedicated Pony model on SiliconFlow)
const MODEL_FLUX         = "black-forest-labs/FLUX-1.1-pro-Ultra";
const MODEL_FLUX_FALLBACK = "black-forest-labs/FLUX.1-pro";
const MODEL_PONY         = "Kwai-Kolors/Kolors";

const FLUX_SYSTEM_PROMPT =
  "vertical portrait composition, tall format, cinematic lighting, " +
  "dramatic shadows, volumetric fog, deep contrast, sharp focus, " +
  "intricate details, atmospheric depth, epic scale, " +
  "professional digital art, rich colors, dynamic pose, " +
  "detailed environment, masterpiece";

const FLUX_NEGATIVE_PROMPT =
  "blurry, watermark, text, logo, horizontal composition, " +
  "landscape format, low quality, bad anatomy, deformed, " +
  "ugly, oversaturated, noise, grain, washed out, " +
  "flat lighting, extra limbs, distorted, amateur, poorly drawn";

const PONY_SYSTEM_PROMPT =
  "score_9, score_8_up, masterpiece, best quality, " +
  "vertical portrait, tall format, vibrant colors, " +
  "detailed eyes, sharp lineart, cinematic lighting, " +
  "intricate details, professional illustration, " +
  "depth of field, dynamic pose, smooth shading";

const PONY_NEGATIVE_PROMPT =
  "score_1, score_2, score_3, score_4, worst quality, " +
  "low quality, blurry, watermark, horizontal composition, " +
  "landscape format, bad anatomy, deformed, extra limbs, " +
  "ugly, poorly drawn eyes, bad hands, missing fingers, flat";

// ---------------------------------------------------------------------------
// Rate limiter — in-memory, 3 req / 60 s per IP
// ---------------------------------------------------------------------------

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

// ---------------------------------------------------------------------------
// Model routing
// ---------------------------------------------------------------------------

function selectModel(prompt: string, category?: string): "flux" | "pony" {
  if (category === "anime") return "pony";
  if (category === "darkfantasy" || category === "cyberpunk") return "flux";
  const lower = prompt.toLowerCase();
  if (PONY_TRIGGERS.some((t) => lower.includes(t))) return "pony";
  if (FLUX_TRIGGERS.some((t) => lower.includes(t))) return "flux";
  return "flux";
}

// ---------------------------------------------------------------------------
// SiliconFlow API call
// ---------------------------------------------------------------------------

interface SiliconFlowResponse {
  images: Array<{ url: string }>;
}

async function callSiliconFlow(
  model: string,
  prompt: string,
  negativePrompt: string,
  imageSize: string
): Promise<SiliconFlowResponse> {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) throw new Error("SILICONFLOW_API_KEY is not configured");

  const res = await fetch("https://api.siliconflow.cn/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      negative_prompt: negativePrompt,
      image_size: imageSize,
      batch_size: 1,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(
      `SiliconFlow responded with ${res.status}: ${body}`
    ) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<SiliconFlowResponse>;
}

// ---------------------------------------------------------------------------
// Generation with model + size fallback
//   Order: [primary model, flux-fallback?] × [768x1376, 720x1280]
//   400 on first size → skip remaining sizes for that model (try next model)
//   Timeout → throw immediately (caller returns 504)
// ---------------------------------------------------------------------------

async function generateImageUrl(
  model: string,
  modelFallback: string | null,
  prompt: string,
  negativePrompt: string
): Promise<string> {
  const models = [model, ...(modelFallback ? [modelFallback] : [])];
  const sizes  = ["768x1376", "720x1280"] as const;

  for (const tryModel of models) {
    for (const size of sizes) {
      try {
        const data = await callSiliconFlow(tryModel, prompt, negativePrompt, size);
        const url = data?.images?.[0]?.url;
        if (url) return url;
        throw new Error("No image URL in SiliconFlow response");
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "TimeoutError") throw err;

        const httpStatus = (err as { status?: number }).status;
        // 400 likely means model/param rejected — skip size loop, try next model
        if (httpStatus === 400) break;

        const isLastModel = tryModel === models[models.length - 1];
        const isLastSize  = size === sizes[sizes.length - 1];
        if (isLastModel && isLastSize) throw err;
      }
    }
  }

  throw new Error("All generation attempts exhausted");
}

// ---------------------------------------------------------------------------
// Sharp post-processing: resize to 9:16 (768×1376), Steam-compatible output
//   Strategy: PNG first (lossless). If > 4.9 MB, fall back to JPEG q95→q80→q65
//   Steam hard limit: 5 MB. We target 4.9 MB to stay safely under.
// ---------------------------------------------------------------------------

const STEAM_SAFE_BYTES = 4.9 * 1024 * 1024;

async function processForSteam(
  imageUrl: string
): Promise<{ buffer: Buffer; mimeType: "image/png" | "image/jpeg" }> {
  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(20_000) });
  if (!imgRes.ok) {
    throw new Error(`Failed to fetch generated image: ${imgRes.status}`);
  }
  const srcBuffer = Buffer.from(await imgRes.arrayBuffer());
  const resized = sharp(srcBuffer).resize(768, 1376, { fit: "cover", position: "centre" });

  // Try PNG (lossless)
  const png = await resized.clone().png({ compressionLevel: 8 }).toBuffer();
  if (png.length <= STEAM_SAFE_BYTES) {
    return { buffer: png, mimeType: "image/png" };
  }

  // Fall back to JPEG — reduce quality until under limit
  for (const quality of [95, 85, 75, 65]) {
    const jpg = await resized.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (jpg.length <= STEAM_SAFE_BYTES) {
      return { buffer: jpg, mimeType: "image/jpeg" };
    }
  }

  // Last resort: JPEG q55 (should always be under 4.9 MB at 768×1376)
  const fallback = await resized.clone().jpeg({ quality: 55, mozjpeg: true }).toBuffer();
  return { buffer: fallback, mimeType: "image/jpeg" };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 3 requests per minute." },
      { status: 429 }
    );
  }

  let body: { prompt?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userPrompt = (body.prompt ?? "").trim();
  if (!userPrompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  if (NSFW_KEYWORDS.some((kw) => userPrompt.toLowerCase().includes(kw))) {
    return NextResponse.json(
      { error: "Prompt contains disallowed content." },
      { status: 400 }
    );
  }

  const modelKey     = selectModel(userPrompt, body.category);
  const model        = modelKey === "pony" ? MODEL_PONY : MODEL_FLUX;
  const modelFallback = modelKey === "flux" ? MODEL_FLUX_FALLBACK : null;
  const systemPrompt = modelKey === "pony" ? PONY_SYSTEM_PROMPT : FLUX_SYSTEM_PROMPT;
  const negativePrompt = modelKey === "pony" ? PONY_NEGATIVE_PROMPT : FLUX_NEGATIVE_PROMPT;
  const finalPrompt  = `${userPrompt}, ${systemPrompt}`;

  let imageUrl: string;
  try {
    imageUrl = await generateImageUrl(model, modelFallback, finalPrompt, negativePrompt);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Image generation timed out. Please try again." },
        { status: 504 }
      );
    }
    console.error("[POST /api/generate]", err);
    return NextResponse.json(
      { error: "Image generation failed after retries. Please try again later." },
      { status: 502 }
    );
  }

  // Process with Sharp → PNG/JPEG, exact 9:16 at 768×1376, Steam ≤ 4.9 MB
  let result: { buffer: Buffer; mimeType: "image/png" | "image/jpeg" };
  try {
    result = await processForSteam(imageUrl);
  } catch (err) {
    console.error("[POST /api/generate] sharp processing failed", err);
    return NextResponse.json(
      { error: "Image processing failed. Please try again." },
      { status: 502 }
    );
  }

  return new NextResponse(result.buffer, {
    status: 200,
    headers: {
      "Content-Type": result.mimeType,
      "Cache-Control": "no-store",
      "X-Model": modelKey,
    },
  });
}
