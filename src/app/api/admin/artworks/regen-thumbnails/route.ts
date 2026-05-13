import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import type { Readable } from "stream";

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function POST() {
  const artworks = await prisma.artwork.findMany({
    where: {
      mediaType: { equals: "animated", mode: "insensitive" },
      coverUrl: null,
      r2Key: { not: null },
    },
    select: { id: true, r2Key: true },
  });

  const results: { ok: number; failed: number; errors: string[] } = { ok: 0, failed: 0, errors: [] };

  for (const artwork of artworks) {
    if (!artwork.r2Key) { results.failed++; continue; }

    try {
      const obj = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: artwork.r2Key }));
      const buffer = await streamToBuffer(obj.Body as Readable);

      const coverBuffer = await sharp(buffer, { animated: false }).webp({ quality: 80 }).toBuffer();
      const coverKey = `covers/${artwork.id}.webp`;

      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: coverKey,
        Body: coverBuffer,
        ContentType: "image/webp",
        ContentLength: coverBuffer.byteLength,
      }));

      await prisma.artwork.update({
        where: { id: artwork.id },
        data: { coverUrl: `${R2_PUBLIC_URL}/${coverKey}` },
      });

      results.ok++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${artwork.id}: ${(err as Error).message}`);
    }
  }

  return Response.json({ total: artworks.length, ...results });
}
