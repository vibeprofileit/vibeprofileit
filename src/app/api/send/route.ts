import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { email, message } = await req.json()

    if (!email || !message) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 })
    }

    await resend.emails.send({
      from: "vibeProfileit Feedback <onboarding@resend.dev>",
      to: "vibeprofileit@gmail.com",
      subject: "New Feedback Ticket",
      text: `From: ${email}\n\n${message}`,
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error("[send/route] Resend error:", err)
    return NextResponse.json({ error: "Internal Server Error." }, { status: 500 })
  }
}
