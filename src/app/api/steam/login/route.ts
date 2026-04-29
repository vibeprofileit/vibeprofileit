import { NextResponse } from "next/server"

export async function GET() {
  const params = new URLSearchParams({
    "openid.mode": "checkid_setup",
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.return_to": `${process.env.NEXTAUTH_URL}/api/steam/callback`,
    "openid.realm": process.env.NEXTAUTH_URL ?? "",
  })

  return NextResponse.redirect(
    `https://steamcommunity.com/openid/login?${params.toString()}`
  )
}
