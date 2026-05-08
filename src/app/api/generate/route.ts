import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import sharp from "sharp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

fal.config({ credentials: process.env.FAL_API_KEY });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NSFW_KEYWORDS = ["nude", "nsfw", "naked", "explicit"];

const PONY_TRIGGERS = [
  "anime", "manga", "waifu", "drawn", "comic",
  "illustration", "2d", "naruto", "demon", "jujutsu",
  "illustrated", "bleach", "one piece", "attack on titan",
  "sword art", "re zero", "hunter x hunter", "chainsaw",
];

const FLUX_TRIGGERS = [
  "photo", "realistic", "cinematic", "portrait", "photography",
  "hyperrealistic", "fantasy", "cyberpunk", "warrior", "dragon",
  "knight", "armor", "sci-fi", "epic", "fps", "rpg", "shooter",
  "mech", "soldier", "ninja", "assassin", "sniper", "mage",
  "wizard", "berserker", "paladin", "warlock", "gunner",
  "mercenary", "hunter", "ranger", "samurai", "viking",
];

const MODEL_FLUX   = "fal-ai/flux-pro/v1.1";
const MODEL_KOLORS = "fal-ai/kolors";

const FLUX_SYSTEM_PROMPT =
  "Steam profile artwork, gaming character portrait, vertical portrait composition, " +
  "tall format 9:16, cinematic lighting, dramatic shadows, volumetric fog, " +
  "deep contrast, sharp focus, intricate details, atmospheric depth, " +
  "epic scale, professional digital art, rich colors, dynamic hero pose, " +
  "detailed armor or outfit, powerful character presence, masterpiece";

const FLUX_NEGATIVE_PROMPT =
  "blurry, watermark, text, logo, horizontal composition, landscape format, " +
  "low quality, bad anatomy, deformed, ugly, oversaturated, noise, grain, " +
  "washed out, flat lighting, extra limbs, distorted, amateur, poorly drawn, " +
  "food, cooking, kitchen, animals, pets, cat, dog, cute, kawaii, chibi, " +
  "peaceful, slice of life, school, classroom, no character, empty scene";

const KOLORS_SYSTEM_PROMPT =
  "anime gaming character illustration, masterpiece, best quality, " +
  "ultra detailed, vertical portrait composition, tall format 9:16, " +
  "vibrant saturated colors, highly detailed eyes, sharp clean lineart, " +
  "dramatic cinematic lighting, dynamic battle pose, detailed background, " +
  "Steam profile artwork, gaming aesthetic, epic atmosphere, " +
  "powerful warrior or hero, intense expression, detailed weapon or armor";

const KOLORS_NEGATIVE_PROMPT =
  "worst quality, low quality, blurry, watermark, text, " +
  "horizontal composition, landscape format, " +
  "bad anatomy, deformed, extra limbs, " +
  "poorly drawn eyes, bad hands, missing fingers, " +
  "flat colors, dull, boring, generic, " +
  "food, animals, cute, kawaii, chibi, slice of life, " +
  "school uniform, classroom, peaceful, no action, " +
  "western cartoon, 3d render, realistic photo";

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

function selectModel(prompt: string, category?: string | null): "flux" | "kolors" {
  if (category === "anime") return "kolors";
  if (category === "darkfantasy" || category === "cyberpunk") return "flux";
  const lower = prompt.toLowerCase();
  if (PONY_TRIGGERS.some((t) => lower.includes(t))) return "kolors";
  if (FLUX_TRIGGERS.some((t) => lower.includes(t))) return "flux";
  return "flux";
}

// ---------------------------------------------------------------------------
// fal.ai image generation
// ---------------------------------------------------------------------------

async function generateImageUrl(
  model: string,
  prompt: string,
  negativePrompt: string
): Promise<string> {
  const result = await fal.subscribe(model, {
    input: {
      prompt,
      negative_prompt: negativePrompt,
      image_size: { width: 768, height: 1376 },
      num_images: 1,
    },
  });

  const images = (result.data as { images?: Array<{ url: string }> }).images;
  const url = images?.[0]?.url;
  if (!url) throw new Error("No image URL in fal.ai response");
  return url;
}

// ---------------------------------------------------------------------------
// Sharp post-processing: resize to 9:16 (768×1376), Steam-compatible output
//   Strategy: PNG first (lossless). If > 4.9 MB, fall back to JPEG q95→q65
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

  const png = await resized.clone().png({ compressionLevel: 8 }).toBuffer();
  if (png.length <= STEAM_SAFE_BYTES) {
    return { buffer: png, mimeType: "image/png" };
  }

  for (const quality of [95, 85, 75, 65]) {
    const jpg = await resized.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (jpg.length <= STEAM_SAFE_BYTES) {
      return { buffer: jpg, mimeType: "image/jpeg" };
    }
  }

  const fallback = await resized.clone().jpeg({ quality: 55, mozjpeg: true }).toBuffer();
  return { buffer: fallback, mimeType: "image/jpeg" };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

const AI_COST = 15;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Login required to use AI Studio." }, { status: 401 });
  }

  const profile = await prisma.profiles.findUnique({
    where:  { user_id: session.user.userId },
    select: { token_balance: true },
  });

  const balance = profile?.token_balance ?? 0;
  if (balance < AI_COST) {
    return NextResponse.json(
      { error: "Not enough tokens. You need 15 tokens to generate.", balance },
      { status: 402 }
    );
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 3 requests per minute." },
      { status: 429 }
    );
  }

  let body: { prompt?: string; category?: string | null };
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
  const model        = modelKey === "kolors" ? MODEL_KOLORS : MODEL_FLUX;
  const systemPrompt = modelKey === "kolors" ? KOLORS_SYSTEM_PROMPT : FLUX_SYSTEM_PROMPT;
  const negativePrompt = modelKey === "kolors" ? KOLORS_NEGATIVE_PROMPT : FLUX_NEGATIVE_PROMPT;
  const finalPrompt  = `${userPrompt}, ${systemPrompt}`;

  let imageUrl: string;
  try {
    imageUrl = await generateImageUrl(model, finalPrompt, negativePrompt);
  } catch (err: unknown) {
    console.error("[POST /api/generate] fal.ai error:", err);
    return NextResponse.json(
      { error: "Image generation failed. Please try again later." },
      { status: 502 }
    );
  }

  let result: { buffer: Buffer; mimeType: "image/png" | "image/jpeg" };
  try {
    result = await processForSteam(imageUrl);
  } catch (err) {
    console.error("[POST /api/generate] sharp processing failed:", err);
    return NextResponse.json(
      { error: "Image processing failed. Please try again." },
      { status: 502 }
    );
  }

  // Deduct tokens after successful generation
  await prisma.profiles.update({
    where: { user_id: session.user.userId },
    data:  { token_balance: { decrement: AI_COST } },
  });

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.mimeType,
      "Cache-Control": "no-store",
      "X-Used-Model": modelKey,
    },
  });
}
