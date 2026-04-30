import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";
import { randomUUID } from "crypto";

const WORKER_BASE = "https://vibe-images.vibeprofileit.workers.dev";

export async function generateGifCover(buffer: Buffer): Promise<string> {
  const meta = await sharp(buffer, { pages: -1 }).metadata();
  const pageCount = meta.pages ?? 1;

  // 10. kare varsa onu al, yoksa son kareye düş
  const targetFrame = Math.min(9, pageCount - 1);

  const coverBuffer = await sharp(buffer, { pages: 1, page: targetFrame })
    .resize({
      width: meta.width,
      height: meta.height,
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })
    .sharpen({ sigma: 0.6, m1: 0.2, m2: 3 })
    .webp({ quality: 100, lossless: true })
    .toBuffer();

  const r2Key = `covers/${randomUUID()}.webp`;

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: coverBuffer,
      ContentType: "image/webp",
      ContentLength: coverBuffer.length,
    })
  );

  return `${WORKER_BASE}/${r2Key}`;
}
