import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  const deny = await requireAdmin(); if (deny) return deny;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const { sourceUrl, width, height, format, sizeBytes } = body as {
    sourceUrl?: string;
    width?: number;
    height?: number;
    format?: string;
    sizeBytes?: number;
  };

  if (!sourceUrl || !sourceUrl.startsWith("http")) {
    return Response.json({ error: "Geçerli bir URL gerekli" }, { status: 400 });
  }

  const artwork = await prisma.artwork.create({
    data: {
      sourceUrl,
      width: Number(width) || 0,
      height: Number(height) || 0,
      format: format?.trim() || "unknown",
      sizeBytes: Number(sizeBytes) || 0,
      status: "PENDING",
    },
  });

  return Response.json(artwork, { status: 201 });
}
