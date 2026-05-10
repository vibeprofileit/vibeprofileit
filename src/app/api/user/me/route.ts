import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await prisma.profiles.findUnique({
    where:  { user_id: session.user.userId },
    select: { token_balance: true },
  })

  const likesCount = await prisma.likes.count({
    where: { user_id: session.user.userId },
  })

  const premiumsCount = await prisma.purchases.count({
    where: { user_id: session.user.userId },
  })

  const generationsCount = await prisma.assets.count({
    where: {
      user_id:    session.user.userId,
      expires_at: { gt: new Date() },
    },
  })

  return NextResponse.json({
    tokenBalance:      profile?.token_balance ?? 0,
    likesCount,
    premiumsCount,
    generationsCount,
  })
}
