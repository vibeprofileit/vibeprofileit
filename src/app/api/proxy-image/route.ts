import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";

const WORKER_BASE = "https://vibe-images.vibeprofileit.workers.dev";
const R2_PUBLIC_BASE = "https://pub-a9fa3eb644a643638e6c89784ccb22fa.r2.dev";
const BUCKET = process.env.R2_BUCKET_NAME!;

function extractR2Key(url: string): string | null {
  if (url.startsWith(WORKER_BASE + "/")) return url.slice(WORKER_BASE.length + 1);
  if (url.startsWith(R2_PUBLIC_BASE + "/")) return url.slice(R2_PUBLIC_BASE.length + 1);
  return null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const r2Key = extractR2Key(url);
  if (!r2Key) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const obj = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: r2Key }));
    if (!obj.Body) return NextResponse.json({ error: "Empty object" }, { status: 502 });

    const contentType = obj.ContentType ?? "application/octet-stream";
    const buffer = Buffer.from(await obj.Body.transformToByteArray());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[proxy-image] R2 fetch failed:", err);
    return NextResponse.json({ error: "R2 fetch failed" }, { status: 502 });
  }
}
