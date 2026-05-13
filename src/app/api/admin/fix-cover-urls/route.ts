import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function POST() {
  const deny = await requireAdmin(); if (deny) return deny;
  const result = await prisma.artwork.updateMany({
    where: { coverUrl: { not: null } },
    data: { coverUrl: null },
  });
  return Response.json({ cleared: result.count });
}
