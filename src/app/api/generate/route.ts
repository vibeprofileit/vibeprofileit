import { NextRequest, NextResponse }    from "next/server";
import { fal }                          from "@fal-ai/client";
import sharp                            from "sharp";
import { randomUUID }                   from "crypto";
import { getServerSession }             from "next-auth";
import { PutObjectCommand }             from "@aws-sdk/client-s3";
import { Resend }                       from "resend";
import { authOptions }                  from "@/app/api/auth/[...nextauth]/route";
import { prisma }                       from "@/lib/prisma";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";

fal.config({ credentials: process.env.FAL_API_KEY });

const resend = new Resend(process.env.RESEND_API_KEY);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NSFW_KEYWORDS = ["nude", "nsfw", "naked", "explicit", "demon girl", "succubus", "lingerie", "bikini", "sexy", "seductive", "pussy", "dick", "cock", "porn", "hentai", "sex", "boobs", "tits"];

const KOLORS_TRIGGERS = [
  // Genel anime/manga
  "anime", "manga", "waifu", "drawn", "comic",
  "illustration", "2d", "illustrated",
  "cel shaded", "toon", "stylized",

  // Klasik anime serileri
  "naruto", "bleach", "one piece", "attack on titan",
  "sword art", "re zero", "hunter x hunter", "chainsaw",
  "demon", "jujutsu", "fullmetal", "dragon ball",
  "death note", "tokyo ghoul", "fairy tail", "black clover",
  "my hero academia", "boku no hero",

  // Anime game / gacha
  "genshin", "honkai", "blue archive", "arknights",
  "nikke", "punishing gray raven", "azur lane",
  "fate grand order", "persona", "nier automata anime",

  // Vtuber
  "vtuber", "hololive", "nijisanji",

  // Stil
  "pixel art", "chibi art", "visual novel",
];

const FLUX_TRIGGERS = [
  // Temel realizm/sinema
  "photo", "realistic", "cinematic", "portrait", "photography",
  "hyperrealistic", "photorealistic",

  // Tür ve atmosfer
  "fantasy", "dark fantasy", "cyberpunk", "steampunk",
  "post apocalyptic", "dystopian", "sci-fi", "space",
  "horror", "gothic", "medieval",

  // Karakter sınıfları
  "warrior", "dragon", "knight", "armor",
  "soldier", "ninja", "assassin", "sniper", "mage",
  "wizard", "berserker", "paladin", "warlock", "gunner",
  "mercenary", "hunter", "ranger", "samurai", "viking",
  "spartan", "gladiator", "pirate", "bounty hunter",
  "demon hunter", "vampire", "werewolf", "orc",

  // Ekipman
  "mech", "robot", "cyborg", "exosuit",
  "sword", "gun", "rifle", "bow", "axe", "shield",

  // Oyun türleri
  "fps", "rpg", "shooter", "battle royale",
  "mmorpg", "soulslike", "hack and slash",

  // Popüler oyunlar (realistic stil)
  "league of legends", "valorant", "call of duty",
  "overwatch", "apex legends", "halo",
  "doom", "witcher", "god of war",
  "dark souls", "elden ring", "diablo",
  "world of warcraft", "dota", "counter strike",
  "pubg", "destiny", "cyberpunk 2077",
  "monster hunter", "sekiro",
];

const MODEL_FLUX   = "fal-ai/flux-pro/v1.1";
const MODEL_KOLORS = "fal-ai/kolors";

const CARS_SYSTEM_PROMPT =
  "Cinematic automotive photography, vertical portrait composition for Steam profile artwork. " +
  "Dramatic studio or street lighting, wet asphalt reflections, moody atmosphere. " +
  "Sharp focus on vehicle body, photorealistic paint and chrome details. " +
  "No people, no text, no watermarks. Professional car photography quality.";

const FLUX_SYSTEM_PROMPT =
  "Professional game key art for a vertical Steam profile artwork showcase. " +
  "Solo character, powerful battle stance, upper body portrait framing. " +
  "Cinematic rim lighting, dark atmospheric background. " +
  "Volumetric fog, sparks and embers in the air. " +
  "Highly detailed, sharp focus, professional concept art quality.";

const FLUX_NEGATIVE_PROMPT =
  // Kalite sorunları
  "blurry, soft focus, low quality, worst quality, jpeg artifacts, compression artifacts, " +
  "noise, grain, washed out, overexposed, underexposed, " +
  // Kompozisyon sorunları
  "horizontal composition, landscape format, wide shot, full body, " +
  "cropped head, out of frame, cut off, " +
  // Anatomi sorunları
  "bad anatomy, deformed, ugly, extra limbs, distorted, " +
  "bad proportions, long neck, duplicate, clone, " +
  "multiple people, crowd, group, " +
  // Stil sorunları
  "watermark, text, logo, signature, " +
  "flat cartoon, anime style, cel shading, " +
  "flat lighting, amateur, poorly drawn, " +
  // Konu dışı
  "food, cooking, kitchen, animals, pets, cat, dog, " +
  "cute, kawaii, chibi, peaceful, " +
  "slice of life, school, classroom, no character, empty scene";

const KOLORS_SYSTEM_PROMPT =
  "masterpiece, best quality, ultra highres, " +
  "2d anime style, cel shading, hand drawn, classic anime, manga illustration, " +
  "anime key visual, official anime art, pixiv style, " +
  "solo, upper body portrait, vertical composition, " +
  "big expressive anime eyes, sharp lineart, clean lines, " +
  "vibrant colors, high contrast";

const KOLORS_NEGATIVE_PROMPT =
  // Kalite sorunları
  "worst quality, low quality, normal quality, lowres, blurry, soft focus, " +
  "jpeg artifacts, compression artifacts, " +
  // Kompozisyon sorunları
  "horizontal composition, landscape format, wide shot, full body, " +
  "cropped, out of frame, cut off, " +
  // Anatomi sorunları
  "bad anatomy, deformed, extra limbs, missing limbs, " +
  "poorly drawn eyes, bad hands, missing fingers, extra fingers, " +
  "bad face, ugly face, asymmetrical face, bad proportions, gross proportions, " +
  "multiple girls, multiple boys, crowd, " +
  // Stil sorunları
  "watermark, text, signature, artist name, " +
  "censored, mosaic, " +
  "dull, boring, washed out, " +
  "monochrome, grayscale, " +
  "western cartoon, 3d render, realistic photo, photorealistic, hyperrealistic, " +
  // Konu dışı
  "food, animals, cute, kawaii, chibi, " +
  "slice of life, school uniform, classroom, peaceful, no action";

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

function selectModel(prompt: string, category?: string | null): "flux" | "kolors" | "cars" {
  if (category === "anime") return "kolors";
  if (category === "cars") return "cars";
  if (category === "darkfantasy" || category === "cyberpunk") return "flux";
  const lower = prompt.toLowerCase();
  if (KOLORS_TRIGGERS.some((t) => lower.includes(t))) return "kolors";
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
// Storage: R2 upload + assets tablosuna kayıt (48 saat TTL)
// ---------------------------------------------------------------------------

async function saveToStorage(
  userId: string,
  result: { buffer: Buffer; mimeType: "image/png" | "image/jpeg" },
  prompt: string,
  modelKey: string,
  category?: string | null
): Promise<void> {
  const ext       = result.mimeType === "image/png" ? "png" : "jpg";
  const r2Key     = `generations/${userId}/${randomUUID()}.${ext}`;
  const r2Url     = `https://vibe-images.vibeprofileit.workers.dev/${r2Key}`;
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await r2.send(new PutObjectCommand({
    Bucket:      R2_BUCKET,
    Key:         r2Key,
    Body:        result.buffer,
    ContentType: result.mimeType,
  }));

  await prisma.assets.create({
    data: {
      user_id:    userId,
      r2_key:     r2Key,
      r2_url:     r2Url,
      prompt,
      model_used: modelKey,
      category:   category ?? null,
      mime_type:  result.mimeType,
      file_size:  result.buffer.length,
      expires_at: expiresAt,
    },
  });
}

// ---------------------------------------------------------------------------
// Admin bildirim emaili
// ---------------------------------------------------------------------------

async function notifyAdmin(opts: {
  displayName: string;
  steamId:     string | undefined;
  prompt:      string;
  modelKey:    string;
  remaining:   number;
}): Promise<void> {
  await resend.emails.send({
    from:    "noreply@vibeprofileit.com",
    to:      "vibeprofileit@gmail.com",
    subject: `New AI Generation — ${opts.displayName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0d0d12;color:#f0f0f0;border-radius:12px">
        <h2 style="margin:0 0 8px;color:#7c3aed">New AI Generation</h2>
        <p style="margin:0 0 24px;font-size:13px;color:#888">VibeProfileit — AI Studio</p>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #222;font-size:13px;color:#888;width:140px">User</td>
            <td style="padding:10px 0;border-bottom:1px solid #222;font-size:14px">${opts.displayName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #222;font-size:13px;color:#888">Steam ID</td>
            <td style="padding:10px 0;border-bottom:1px solid #222;font-size:14px">${opts.steamId ?? "—"}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #222;font-size:13px;color:#888">Model</td>
            <td style="padding:10px 0;border-bottom:1px solid #222;font-size:14px;text-transform:uppercase">${opts.modelKey}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #222;font-size:13px;color:#888">Tokens Left</td>
            <td style="padding:10px 0;border-bottom:1px solid #222;font-size:14px">${opts.remaining}</td>
          </tr>
          <tr>
            <td style="padding:16px 0 0;font-size:13px;color:#888;vertical-align:top">Prompt</td>
            <td style="padding:16px 0 0;font-size:14px;line-height:1.6">${opts.prompt}</td>
          </tr>
        </table>
      </div>
    `,
  });
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

  const modelKey       = selectModel(userPrompt, body.category);
  const model          = modelKey === "kolors" ? MODEL_KOLORS : MODEL_FLUX;
  const systemPrompt   = modelKey === "kolors" ? KOLORS_SYSTEM_PROMPT : modelKey === "cars" ? CARS_SYSTEM_PROMPT : FLUX_SYSTEM_PROMPT;
  const negativePrompt = modelKey === "kolors" ? KOLORS_NEGATIVE_PROMPT : FLUX_NEGATIVE_PROMPT;
  const finalPrompt    = `${userPrompt}, ${systemPrompt}`;

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

  // Token düşümü
  const updated = await prisma.profiles.update({
    where:  { user_id: session.user.userId },
    data:   { token_balance: { decrement: AI_COST } },
    select: { token_balance: true },
  });

  // R2 depolama + assets kaydı (fire-and-forget, hata response'u engellemez)
  saveToStorage(session.user.userId, result, userPrompt, modelKey, body.category)
    .catch(err => console.error("[POST /api/generate] storage failed:", err));

  // Admin bildirimi (fire-and-forget)
  notifyAdmin({
    displayName: session.user.name ?? session.user.steamId ?? "Unknown",
    steamId:     session.user.steamId,
    prompt:      userPrompt,
    modelKey,
    remaining:   updated.token_balance,
  }).catch(() => {});

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type":  result.mimeType,
      "Cache-Control": "no-store",
      "X-Used-Model":  modelKey,
    },
  });
}



























