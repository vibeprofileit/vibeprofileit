import { type NextRequest, NextResponse } from "next/server"

const ALLOWED_HOSTS = [
  "community.akamai.steamstatic.com",
  "community.cloudflare.steamstatic.com",
  "cdn.cloudflare.steamstatic.com",
  "cdn.akamai.steamstatic.com",
  "avatars.steamstatic.com",
  "avatars.akamai.steamstatic.com",
]

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url")
  if (!raw) return new NextResponse("url param required", { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return new NextResponse("Invalid URL", { status: 400 })
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.includes(parsed.hostname)) {
    console.warn("[imgproxy] Forbidden host:", parsed.hostname)
    return new NextResponse("Forbidden host", { status: 403 })
  }

  console.log("[imgproxy] Fetching:", parsed.toString())

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0" },
      // next: { revalidate } Next.js App Router cache
      next: { revalidate: 86400 },
    })

    console.log("[imgproxy] Upstream status:", upstream.status, "for", parsed.pathname)

    if (!upstream.ok) {
      return new NextResponse(`Upstream ${upstream.status}`, { status: 502 })
    }

    const contentType = upstream.headers.get("content-type") ?? "image/png"
    const buffer = await upstream.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    })
  } catch (err) {
    console.error("[imgproxy] Fetch error:", err)
    return new NextResponse("Fetch failed", { status: 502 })
  }
}
