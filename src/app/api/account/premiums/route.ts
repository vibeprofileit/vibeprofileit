import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const purchases = await prisma.purchases.findMany({
    where:   { user_id: session.user.userId },
    orderBy: { created_at: "desc" },
    select:  { asset_id: true },
  })

  if (purchases.length === 0) {
    return NextResponse.json({ items: [], ids: [] })
  }

  const artworkIds = purchases.map(p => p.asset_id).filter((id): id is string => id !== null)

  const artworks = await prisma.artwork.findMany({
    where:  { id: { in: artworkIds }, status: "APPROVED" },
    select: {
      id: true, sourceUrl: true, coverUrl: true,
      width: true, height: true, sizeBytes: true, format: true,
      theme: true, color: true, vibe: true,
      mediaType: true, isFeatured: true, isNSFW: true, isPremium: true,
      createdAt: true,
    },
  })

  const map = new Map(artworks.map(a => [a.id, a]))
  const items = artworkIds
    .map(id => map.get(id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map(a => ({
      id:         a.id,
      src:        a.sourceUrl,
      coverUrl:   a.coverUrl ?? null,
      theme:      a.theme    ?? "",
      color:      a.color    ?? "",
      style:      a.vibe     ?? "",
      width:      a.width,
      height:     a.height,
      format:     a.format.toUpperCase(),
      sizeMB:     (a.sizeBytes / (1024 * 1024)).toFixed(2),
      isAnimated: a.mediaType?.toLowerCase() === "animated",
      isAdult:    a.isNSFW,
      isFeatured: a.isFeatured,
      isPremium:  a.isPremium,
      createdAt:  a.createdAt.toISOString(),
      realViews:  0,
      realLikes:  0,
    }))

  return NextResponse.json({ items, ids: artworkIds })
}
