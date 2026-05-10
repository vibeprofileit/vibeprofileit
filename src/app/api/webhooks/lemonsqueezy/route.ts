import { NextRequest, NextResponse } from "next/server"
import { createHmac }               from "crypto"
import { prisma }                   from "@/lib/prisma"

const VARIANT_TOKENS: Record<string, number> = {
  [process.env.NEXT_PUBLIC_LS_VARIANT_STARTER!]: 20,
  [process.env.NEXT_PUBLIC_LS_VARIANT_POPULAR!]: 50,
  [process.env.NEXT_PUBLIC_LS_VARIANT_PRO!]:     110,
}

export async function POST(req: NextRequest) {
  const rawBody   = await req.text()
  const signature = req.headers.get("x-signature") ?? ""
  const secret    = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? ""

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const payload    = JSON.parse(rawBody)
  const eventName: string = payload?.meta?.event_name ?? ""

  if (eventName !== "order_created") {
    return NextResponse.json({ received: true })
  }

  const order       = payload?.data?.attributes
  const lsOrderId   = String(payload?.data?.id ?? "")
  const userId      = payload?.meta?.custom_data?.userId as string | undefined
  const orderStatus = order?.status as string | undefined
  const orderTotal  = Number(order?.total ?? 0) / 100

  if (orderStatus !== "paid" || !userId || !lsOrderId) {
    return NextResponse.json({ received: true })
  }

  // Idempotency: daha önce işlendiyse tekrar işleme
  const existing = await prisma.purchases.findUnique({
    where: { ls_order_id: lsOrderId },
  })
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  const orderItems    = payload?.included?.filter((i: { type: string }) => i.type === "order-items") ?? []
  const itemVariantId = String(orderItems?.[0]?.attributes?.variant_id ?? "")
  const tokensToAdd   = VARIANT_TOKENS[itemVariantId]

  if (!tokensToAdd) {
    return NextResponse.json({ error: "Unknown variant" }, { status: 400 })
  }

  // Atomik: token yükle + purchase kaydı + transaction kaydı
  await prisma.$transaction([
    prisma.profiles.update({
      where: { user_id: userId },
      data:  { token_balance: { increment: tokensToAdd } },
    }),
    prisma.purchases.create({
      data: {
        user_id:     userId,
        ls_order_id: lsOrderId,
        tokens_spent: tokensToAdd,
      },
    }),
    prisma.transactions.create({
      data: {
        user_id:        userId,
        amount:         orderTotal,
        token_count:    tokensToAdd,
        payment_method: "lemonsqueezy",
        status:         "paid",
      },
    }),
  ])

  return NextResponse.json({ success: true, tokensAdded: tokensToAdd })
}
