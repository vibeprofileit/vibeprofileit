import { type NextRequest, NextResponse } from "next/server"
import { encode } from "next-auth/jwt"

export async function GET(req: NextRequest) {
  // ─── 1. HAM QUERY STRING ────────────────────────────────────────────────────
  // req.url'den doğrudan alıyoruz — NextAuth'un parse/re-encode zincirini
  // tamamen bypass eder, Steam'in gönderdiği encoding bozulmadan kalır.
  const incomingUrl = new URL(req.url)
  const verifyParams = new URLSearchParams(incomingUrl.search)

  // openid.mode'u check_authentication yap, diğer tüm parametreler dokunulmaz
  verifyParams.set("openid.mode", "check_authentication")

  // ─── 2. STEAM'E DOĞRULAMA İSTEĞİ ───────────────────────────────────────────
  const verifyRes = await fetch("https://steamcommunity.com/openid/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  })
  const verifyText = await verifyRes.text()

  if (!verifyText.includes("is_valid:true")) {
    return NextResponse.redirect(
      new URL("/login?error=OAuthCallbackError", incomingUrl.origin)
    )
  }

  // ─── 3. STEAM ID ────────────────────────────────────────────────────────────
  const claimedId = verifyParams.get("openid.claimed_id") ?? ""
  const steamId = claimedId.split("/").pop() ?? ""

  if (!steamId) {
    return NextResponse.redirect(
      new URL("/login?error=NoSteamId", incomingUrl.origin)
    )
  }

  // ─── 4. PROFİL BİLGİLERİ ───────────────────────────────────────────────────
  const profileRes = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`
  )
  const profileJson = await profileRes.json()
  const player = profileJson?.response?.players?.[0]

  if (!player) {
    return NextResponse.redirect(
      new URL("/login?error=NoSteamProfile", incomingUrl.origin)
    )
  }

  // ─── 5. NEXTAUTH JWT OLUŞTUR ─────────────────────────────────────────────────
  // NextAuth'un kendi encode fonksiyonuyla token üretiyoruz; useSession() ve
  // getServerSession() doğrudan bu cookie'yi okur.
  const jwt = await encode({
    token: {
      sub: steamId,
      name: player.personaname as string,
      email: `${steamId}@steam.placeholder`,
      picture: player.avatarfull as string,
      steamId,
      personaName: player.personaname as string,
      avatarFull: player.avatarfull as string,
    },
    secret: process.env.NEXTAUTH_SECRET!,
  })

  // ─── 6. SESSION COOKIE ──────────────────────────────────────────────────────
  // Production'da __Secure- prefix zorunlu (HTTPS + Secure flag gerektirir).
  const isProd = process.env.NODE_ENV === "production"
  const cookieName = isProd
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token"

  const response = NextResponse.redirect(
    new URL("/", incomingUrl.origin)
  )
  response.cookies.set(cookieName, jwt, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 gün
  })

  return response
}
