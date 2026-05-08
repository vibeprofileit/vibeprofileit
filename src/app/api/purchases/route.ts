import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

const PREMIUM_COST = 10

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { artworkId } = await req.json()
  if (!artworkId) {
    return NextResponse.json({ error: "artworkId required" }, { status: 400 })
  }

  const userId = session.user.userId

  // Artwork exists and is premium?
  const artwork = await prisma.artwork.findUnique({
    where:  { id: artworkId },
    select: { id: true, isPremium: true, status: true },
  })

  if (!artwork || !artwork.isPremium || artwork.status !== "APPROVED") {
    return NextResponse.json({ error: "Artwork not found or not premium" }, { status: 404 })
  }

  // Already purchased?
  const existing = await prisma.purchases.findUnique({
    where: { user_id_asset_id: { user_id: userId, asset_id: artworkId } },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({ error: "Already purchased" }, { status: 409 })
  }

  // Check balance
  const profile = await prisma.profiles.findUnique({
    where:  { user_id: userId },
    select: { token_balance: true },
  })

  const balance = profile?.token_balance ?? 0

  if (balance < PREMIUM_COST) {
    return NextResponse.json(
      { error: "Insufficient tokens", balance },
      { status: 402 }
    )
  }

  // Deduct tokens + create purchase in one transaction
  const [updatedProfile] = await prisma.$transaction([
    prisma.profiles.update({
      where: { user_id: userId },
      data:  { token_balance: { decrement: PREMIUM_COST } },
    }),
    prisma.purchases.create({
      data: {
        user_id:      userId,
        asset_id:     artworkId,
        tokens_spent: PREMIUM_COST,
      },
    }),
  ])

  return NextResponse.json({
    success:    true,
    newBalance: updatedProfile.token_balance,
  })
}
