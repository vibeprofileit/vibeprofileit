import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// Beğeni durumunu sorgula
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.userId) return NextResponse.json({ liked: false })

  const artworkId = req.nextUrl.searchParams.get("artworkId")
  if (!artworkId) return NextResponse.json({ liked: false })

  const existing = await prisma.likes.findUnique({
    where: { user_id_artwork_id: { user_id: session.user.userId, artwork_id: artworkId } },
    select: { id: true },
  })

  return NextResponse.json({ liked: !!existing })
}

// Beğeni toggle (varsa sil, yoksa ekle)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { artworkId } = await req.json()
  if (!artworkId) return NextResponse.json({ error: "artworkId required" }, { status: 400 })

  const key = { user_id: session.user.userId, artwork_id: artworkId }

  const existing = await prisma.likes.findUnique({
    where: { user_id_artwork_id: key },
    select: { id: true },
  })

  if (existing) {
    await prisma.likes.delete({ where: { user_id_artwork_id: key } })
    return NextResponse.json({ liked: false })
  } else {
    await prisma.likes.create({ data: key })
    return NextResponse.json({ liked: true })
  }
}
