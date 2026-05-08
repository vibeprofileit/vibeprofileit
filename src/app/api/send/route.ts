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
      from: "onboarding@resend.dev",
      to: "vibeprofileit@gmail.com",
      subject: `New Feedback Ticket — from ${email}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0d0d12;color:#f0f0f0;border-radius:12px">
          <h2 style="margin:0 0 8px;color:#7c3aed">New Feedback Ticket</h2>
          <p style="margin:0 0 24px;font-size:13px;color:#888">VibeProfileit — Feedback &amp; Support</p>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #222;font-size:13px;color:#888;width:100px">From</td>
              <td style="padding:10px 0;border-bottom:1px solid #222;font-size:14px">${email}</td>
            </tr>
            <tr>
              <td style="padding:16px 0 0;font-size:13px;color:#888;vertical-align:top">Message</td>
              <td style="padding:16px 0 0;font-size:14px;line-height:1.6;white-space:pre-wrap">${message}</td>
            </tr>
          </table>
        </div>
      `,
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error("[send/route] Resend error:", err)
    return NextResponse.json({ error: "Internal Server Error." }, { status: 500 })
  }
}
