import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return Response.json({ error: "id gerekli" }, { status: 400 });

  let isFeatured: boolean;
  try {
    const body = await request.json();
    isFeatured = Boolean(body.isFeatured);
  } catch {
    return Response.json({ error: "Geçersiz body" }, { status: 400 });
  }

  try {
    const updated = await prisma.artwork.update({
      where: { id },
      data: { isFeatured },
    });
    return Response.json(updated);
  } catch (err) {
    console.error("[FEATURED] DB güncelleme hatası:", err);
    return Response.json({ error: "DB güncelleme başarısız" }, { status: 500 });
  }
}
