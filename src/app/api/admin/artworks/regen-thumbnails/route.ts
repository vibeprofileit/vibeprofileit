import { prisma } from "@/lib/prisma";
import { generateGifCover } from "@/lib/thumbnail";
import type { NextRequest } from "next/server";

const BATCH_SIZE = 5;

export async function POST(request: NextRequest) {
  const { offset = 0 } = await request.json().catch(() => ({}));

  const gifs = await prisma.artwork.findMany({
    where: {
      mediaType: { equals: "animated", mode: "insensitive" },
      coverUrl: null,
    },
    select: { id: true, sourceUrl: true },
    orderBy: { createdAt: "asc" },
    skip: offset,
    take: BATCH_SIZE,
  });

  if (gifs.length === 0) {
    return Response.json({ processed: 0, remaining: 0, done: true });
  }

  const results = await Promise.allSettled(
    gifs.map(async (gif) => {
      const res = await fetch(gif.sourceUrl, {
        headers: { "User-Agent": "vibeProfileit-regen/1.0" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const coverUrl = await generateGifCover(buffer);
      await prisma.artwork.update({ where: { id: gif.id }, data: { coverUrl } });
      return gif.id;
    })
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed    = results.filter((r) => r.status === "rejected").length;

  const remaining = await prisma.artwork.count({
    where: {
      mediaType: { equals: "animated", mode: "insensitive" },
      coverUrl: null,
    },
  });

  return Response.json({ processed: succeeded, failed, remaining, done: remaining === 0 });
}
