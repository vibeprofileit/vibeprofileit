import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "vibe-images.vibeprofileit.workers.dev",
  "pub-a9fa3eb644a643638e6c89784ccb22fa.r2.dev",
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
  }

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  return new NextResponse(res.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
