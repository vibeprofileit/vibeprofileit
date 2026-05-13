import { PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { ArtworkStatus } from "@prisma/client";

const WORKER_BASE = "https://vibe-images.vibeprofileit.workers.dev";

export async function GET(request: NextRequest) {
  const statusParam = request.nextUrl.searchParams.get("status") ?? "PENDING";
  const status = statusParam as ArtworkStatus;
  try {
    const artworks = await prisma.artwork.findMany({
      where: { status },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "asc" }],
    });
    return Response.json(artworks);
  } catch {
    try {
      const artworks = await prisma.artwork.findMany({
        where: { status },
        orderBy: { createdAt: "asc" },
      });
      return Response.json(artworks);
    } catch (err) {
      console.error("[GET] DB hatası:", err);
      return Response.json({ error: "Database error" }, { status: 500 });
    }
  }
}

export async function PATCH(request: NextRequest) {
  const { id, theme, color, vibe, mediaType, isFeatured, isNSFW, isPremium, moveToPending, toggleFeatured, togglePremium } = await request.json();

  if (!id) return Response.json({ error: "id gerekli" }, { status: 400 });

  if (moveToPending) {
    try {
      const updated = await prisma.artwork.update({ where: { id }, data: { status: "PENDING" } });
      return Response.json(updated);
    } catch (err) {
      console.error("[moveToPending] DB hatası:", err);
      return Response.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  if (toggleFeatured !== undefined) {
    try {
      const updated = await prisma.artwork.update({ where: { id }, data: { isFeatured: toggleFeatured } });
      return Response.json(updated);
    } catch (err) {
      console.error("[toggleFeatured] DB hatası:", err);
      return Response.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  if (togglePremium !== undefined) {
    try {
      const updated = await prisma.artwork.update({ where: { id }, data: { isPremium: togglePremium } });
      return Response.json(updated);
    } catch (err) {
      console.error("[togglePremium] DB hatası:", err);
      return Response.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  const existing = await prisma.artwork.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Artwork bulunamadı" }, { status: 404 });

  let r2Key = existing.r2Key;
  let finalSourceUrl = existing.sourceUrl;

  if (r2Key?.startsWith("pending/")) {
    const ext = r2Key.split(".").pop() ?? "jpg";
    const folder = isPremium ? "premium" : "artworks";
    const newR2Key = `${folder}/${randomUUID()}.${ext}`;
    try {
      await r2.send(new CopyObjectCommand({
        Bucket: R2_BUCKET,
        CopySource: `${R2_BUCKET}/${r2Key}`,
        Key: newR2Key,
      }));
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: r2Key }));
      r2Key = newR2Key;
      finalSourceUrl = `${WORKER_BASE}/${newR2Key}`;
      console.log(`[APPROVE] pending → ${folder}: ${newR2Key}`);
    } catch (err) {
      console.error("[APPROVE] R2 taşıma hatası:", err);
      return Response.json({ error: "R2 taşıma başarısız" }, { status: 502 });
    }
  } else if (!r2Key) {
    let imageBuffer: Buffer;
    let contentType = "image/jpeg";
    try {
      const res = await fetch(existing.sourceUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      contentType = res.headers.get("content-type") ?? "image/jpeg";
      imageBuffer = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.error("[APPROVE] İndirme hatası:", err);
      return Response.json(
        { error: `Görsel indirilemedi: ${(err as Error).message}` },
        { status: 502 }
      );
    }

    const formatMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
    };
    const ext = formatMap[contentType.split(";")[0].trim()] ?? existing.format ?? "jpg";

    r2Key = `${isPremium ? "premium" : "artworks"}/${randomUUID()}.${ext}`;
    try {
      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: r2Key,
          Body: imageBuffer,
          ContentType: contentType.split(";")[0].trim(),
          ContentLength: imageBuffer.length,
        })
      );
    } catch (err) {
      console.error("[APPROVE] R2 yükleme hatası:", err);
      return Response.json({ error: "R2 yükleme başarısız" }, { status: 502 });
    }

    finalSourceUrl = `${WORKER_BASE}/${r2Key}`;
    console.log(`[APPROVE] R2'ye yüklendi: ${r2Key}`);
  }

  try {
    const updated = await prisma.artwork.update({
      where: { id },
      data: {
        ...(theme !== undefined && { theme }),
        ...(color !== undefined && { color }),
        ...(vibe !== undefined && { vibe }),
        ...(mediaType !== undefined && { mediaType }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(isNSFW !== undefined && { isNSFW }),
        ...(isPremium !== undefined && { isPremium }),
        r2Key,
        sourceUrl: finalSourceUrl,
        status: "APPROVED",
      },
    });
    return Response.json(updated);
  } catch (err) {
    console.error("[APPROVE] DB güncelleme hatası:", err);
    return Response.json({ error: (err as Error).message ?? "DB güncelleme başarısız" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { id, hardDelete } = await request.json();
  if (!id) return Response.json({ error: "id gerekli" }, { status: 400 });

  if (hardDelete) {
    const artwork = await prisma.artwork.findUnique({ where: { id } });
    if (!artwork) return Response.json({ error: "Artwork bulunamadı" }, { status: 404 });

    if (artwork.r2Key) {
      try {
        await r2.send(
          new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: artwork.r2Key,
          })
        );
        console.log(`[DELETE] R2'den silindi: ${artwork.r2Key}`);
      } catch (err) {
        console.error("[DELETE] R2 silme hatası:", err);
        return Response.json({ error: "R2 silme başarısız" }, { status: 502 });
      }
    }

    if (artwork.coverUrl) {
      const coverKey = artwork.coverUrl.replace(WORKER_BASE + "/", "");
      if (coverKey !== artwork.coverUrl) {
        try {
          await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: coverKey }));
          console.log(`[DELETE] Cover silindi: ${coverKey}`);
        } catch (err) {
          console.error("[DELETE] Cover silme hatası (non-fatal):", err);
        }
      }
    }

    await prisma.artwork.delete({ where: { id } });
    return Response.json({ success: true });
  }

  const toReject = await prisma.artwork.findUnique({ where: { id } });
  if (toReject?.r2Key) {
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: toReject.r2Key }));
      console.log(`[REJECT] R2'den silindi: ${toReject.r2Key}`);
    } catch (err) {
      console.error("[REJECT] R2 silme hatası:", err);
    }
  }

  if (toReject?.coverUrl) {
    const coverKey = toReject.coverUrl.replace(WORKER_BASE + "/", "");
    if (coverKey !== toReject.coverUrl) {
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: coverKey }));
        console.log(`[REJECT] Cover silindi: ${coverKey}`);
      } catch (err) {
        console.error("[REJECT] Cover silme hatası (non-fatal):", err);
      }
    }
  }

  await prisma.artwork.delete({ where: { id } });
  return Response.json({ success: true });
}
