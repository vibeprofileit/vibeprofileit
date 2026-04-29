import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const CHUNK = 24;

function seededRandom(seed: number) {
  let s = ((seed ^ 0xdeadbeef) >>> 0) || 1;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  const rand = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Arka arkaya max 3 GIF gelsin; statics arasına serpiştir
function interleave(
  items: Array<{ id: string; mediaType: string | null }>,
  seed: number
): typeof items {
  const gifs    = items.filter(a => a.mediaType?.toLowerCase() === "animated");
  const statics = items.filter(a => a.mediaType?.toLowerCase() !== "animated");
  if (!gifs.length || !statics.length) return items;

  const rand     = seededRandom(seed ^ 0x87654321);
  const gifRatio = gifs.length / items.length;
  const result: typeof items = [];
  let gi = 0, si = 0, consecutive = 0;

  while (gi < gifs.length || si < statics.length) {
    const mustStatic = consecutive >= 3 && si < statics.length;
    const mustGif    = gi < gifs.length && si >= statics.length;
    if (!mustStatic && (mustGif || (gi < gifs.length && rand() < gifRatio))) {
      result.push(gifs[gi++]);
      consecutive++;
    } else if (si < statics.length) {
      result.push(statics[si++]);
      consecutive = 0;
    } else {
      result.push(gifs[gi++]);
      consecutive++;
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  const sp       = request.nextUrl.searchParams;
  const limit    = Math.min(Math.max(Number(sp.get("limit")    ?? CHUNK), 1), 100);
  const offset   = Math.max(Number(sp.get("offset")   ?? 0), 0);
  const seed     = (Number(sp.get("seed")     ?? 0) | 0) || Date.now();
  const category = sp.get("category") ?? "";
  const search   = sp.get("search")   ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andClauses: any[] = [{ status: "APPROVED" }];

  if (category === "Animated") {
    andClauses.push({ mediaType: { equals: "animated", mode: "insensitive" } });
  } else if (category === "Static") {
    andClauses.push({ NOT: { mediaType: { equals: "animated", mode: "insensitive" } } });
  } else if (category === "✨ Neon") {
    andClauses.push({ OR: [
      { color: { contains: "Neon", mode: "insensitive" } },
      { vibe:  { contains: "Neon", mode: "insensitive" } },
      { theme: { contains: "Neon", mode: "insensitive" } },
    ]});
  } else if (category) {
    andClauses.push({ OR: [
      { theme: { equals: category, mode: "insensitive" } },
      { vibe:  { equals: category, mode: "insensitive" } },
    ]});
  }

  if (search) {
    andClauses.push({ OR: [
      { theme: { contains: search, mode: "insensitive" } },
      { color: { contains: search, mode: "insensitive" } },
      { vibe:  { contains: search, mode: "insensitive" } },
    ]});
  }

  const where = andClauses.length === 1 ? andClauses[0] : { AND: andClauses };

  try {
    const [allIds, total] = await Promise.all([
      prisma.artwork.findMany({ where, select: { id: true, mediaType: true }, orderBy: { id: "asc" } }),
      prisma.artwork.count({ where }),
    ]);

    const shuffled    = seededShuffle(allIds, seed);
    const interleaved = interleave(shuffled, seed);
    const page        = interleaved.slice(offset, offset + limit);
    const pageIds     = page.map(a => a.id);

    const artworks = pageIds.length > 0
      ? await prisma.artwork.findMany({
          where:  { id: { in: pageIds } },
          select: {
            id: true, sourceUrl: true, width: true, height: true,
            sizeBytes: true, format: true, theme: true, color: true,
            vibe: true, mediaType: true, isFeatured: true, isNSFW: true, createdAt: true,
          },
        })
      : [];

    const artworkMap      = new Map(artworks.map(a => [a.id, a]));
    const orderedArtworks = pageIds
      .map(id => artworkMap.get(id))
      .filter((a): a is NonNullable<typeof a> => !!a && !!a.sourceUrl);

    const items = orderedArtworks.map(a => ({
      id:         a.id,
      src:        a.sourceUrl!,
      theme:      a.theme     ?? "",
      color:      a.color     ?? "",
      style:      a.vibe      ?? "",
      width:      a.width,
      height:     a.height,
      format:     a.format.toUpperCase(),
      sizeMB:     (a.sizeBytes / (1024 * 1024)).toFixed(2),
      isAnimated: a.mediaType?.toLowerCase() === "animated",
      isAdult:    a.isNSFW,
      isFeatured: a.isFeatured,
      createdAt:  a.createdAt.toISOString(),
      realViews:  0,
      realLikes:  0,
    }));

    return NextResponse.json({ items, total, hasMore: offset + page.length < total });
  } catch (err) {
    console.error("[GET /api/gallery]", err);
    return NextResponse.json({ error: "Veri çekilemedi" }, { status: 500 });
  }
}
