import { prisma } from "@/lib/prisma";

export async function POST() {
  const result = await prisma.artwork.updateMany({
    where: { coverUrl: { not: null } },
    data: { coverUrl: null },
  });
  return Response.json({ cleared: result.count });
}
