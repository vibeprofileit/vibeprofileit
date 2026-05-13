import { HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import type { Readable } from "stream";
import { requireAdmin } from "@/lib/adminAuth";

const WORKER_BASE = "https://vibe-images.vibeprofileit.workers.dev";
const R2_PUBLIC_URL = "https://pub-a9fa3eb644a643638e6c89784ccb22fa.r2.dev";

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// DB'deki yanlış R2_PUBLIC_URL'leri Worker URL'e çevirir (WebP zaten R2'de var)
export async function PATCH() {
  const deny = await requireAdmin(); if (deny) return deny;
  const result = await prisma.$executeRaw`
    UPDATE "Gallery_page"
    SET "coverUrl" = REPLACE("coverUrl", ${R2_PUBLIC_URL}, ${WORKER_BASE})
    WHERE "coverUrl" LIKE ${R2_PUBLIC_URL + "%"}
  `;
  return Response.json({ fixed: result });
}

// Yeni thumbnail üretimi: coverUrl eksik veya yanlış olan animated artwork'ler
export async function POST() {
  const deny = await requireAdmin(); if (deny) return deny;
  const artworks = await prisma.artwork.findMany({
    where: {
      mediaType: { equals: "animated", mode: "insensitive" },
      r2Key: { not: null },
      OR: [
        { coverUrl: null },
        { coverUrl: { not: { startsWith: WORKER_BASE } } },
      ],
    },
    select: { id: true, r2Key: true },
  });

  const results: { ok: number; failed: number; errors: string[] } = { ok: 0, failed: 0, errors: [] };

  for (const artwork of artworks) {
    if (!artwork.r2Key) { results.failed++; continue; }

    const coverKey = `covers/${artwork.id}.webp`;
    const coverUrl = `${WORKER_BASE}/${coverKey}`;

    try {
      let needsUpload = true;
      try {
        await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: coverKey }));
        needsUpload = false;
      } catch {
        needsUpload = true;
      }

      if (needsUpload) {
        const obj = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: artwork.r2Key }));
        const buffer = await streamToBuffer(obj.Body as Readable);
        const coverBuffer = await sharp(buffer, { animated: false }).webp({ quality: 80 }).toBuffer();
        await r2.send(new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: coverKey,
          Body: coverBuffer,
          ContentType: "image/webp",
          ContentLength: coverBuffer.byteLength,
        }));
      }

      await prisma.artwork.update({
        where: { id: artwork.id },
        data: { coverUrl },
      });

      results.ok++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${artwork.id}: ${(err as Error).message}`);
    }
  }

  return Response.json({ total: artworks.length, ...results });
}
