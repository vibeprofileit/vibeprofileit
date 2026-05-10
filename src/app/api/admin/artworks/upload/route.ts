import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import sharp from "sharp";

const WORKER_BASE = "https://vibe-images.vibeprofileit.workers.dev";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif"]);

const MAX_SIZE_BYTES = 21 * 1024 * 1024; // 21 MB

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "FormData okunamadı" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Dosya alanı eksik" }, { status: 400 });
  }

  // Format kontrolü — WebP ve diğerleri yasak
  if (!ALLOWED_TYPES.has(file.type)) {
    const msg =
      file.type === "image/webp"
        ? "WebP Steam'de çalışmaz; JPEG, PNG veya GIF yükle"
        : `Desteklenmeyen format: ${file.type}`;
    return Response.json({ error: msg }, { status: 400 });
  }

  // Boyut (dosya) kontrolü
  if (file.size > MAX_SIZE_BYTES) {
    return Response.json(
      { error: `Dosya 21 MB sınırını aşıyor (${(file.size / 1024 / 1024).toFixed(1)} MB)` },
      { status: 400 }
    );
  }

  // ── Elite Filtre: sharp ile gerçek meta veri kontrolü ────────────────────
  const buffer = Buffer.from(await file.arrayBuffer());

  let imgMeta: sharp.Metadata;
  try {
    imgMeta = await sharp(buffer).metadata();
  } catch {
    return Response.json({ error: "Görsel okunamadı; dosya bozuk olabilir" }, { status: 400 });
  }

  const imgWidth = imgMeta.width ?? 0;
  const imgHeight = imgMeta.height ?? 0;

  // Oran kontrolü — dikey zorunlu
  if (imgHeight <= imgWidth) {
    return Response.json(
      { error: "Steam Vitrini için görsel dikey olmalı (height > width)" },
      { status: 400 }
    );
  }

  // Minimum genişlik kontrolü — GIF: 506px, Statik: 630px
  const isGif = file.type === "image/gif";
  const minWidth = isGif ? 506 : 630;
  if (imgWidth < minWidth) {
    return Response.json(
      { error: `Minimum genişlik ${minWidth}px olmalı (mevcut: ${imgWidth}px)` },
      { status: 400 }
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  const width = imgWidth;
  const height = imgHeight;
  const format = (formData.get("format") as string | null)?.trim() || file.type.split("/")[1] || "unknown";

  // R2'ye geçici olarak pending/ prefix ile yükle — approve edilince artworks/'a taşınır
  const ext = format === "jpeg" ? "jpg" : format;
  const r2Key = `pending/${randomUUID()}.${ext}`;

  console.log(`[UPLOAD] R2'ye gönderiliyor → Bucket: ${R2_BUCKET} | Key: ${r2Key} | ContentType: ${file.type} | Size: ${file.size}`);
  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: buffer,
        ContentType: file.type,
        ContentLength: file.size,
      })
    );
    console.log(`[UPLOAD] R2 başarılı → ${r2Key}`);
  } catch (err) {
    console.error("[UPLOAD] R2 yükleme hatası:", JSON.stringify(err, null, 2));
    return Response.json({ error: "R2 yükleme başarısız" }, { status: 502 });
  }

  const sourceUrl = `${WORKER_BASE}/${r2Key}`;

  const artwork = await prisma.artwork.create({
    data: {
      sourceUrl,
      r2Key,
      width,
      height,
      format,
      sizeBytes: file.size,
      status: "PENDING",
    },
  });

  return Response.json(artwork, { status: 201 });
}
