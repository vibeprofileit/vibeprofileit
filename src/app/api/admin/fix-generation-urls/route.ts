import { prisma } from "@/lib/prisma";

const OLD = "https://pub-a9fa3eb644a643638e6c89784ccb22fa.r2.dev/";
const NEW = "https://vibe-images.vibeprofileit.workers.dev/";

export async function POST() {
  const assets = await prisma.assets.findMany({
    where: { r2_url: { contains: "pub-a9fa3eb644a643638e6c89784ccb22fa.r2.dev" } },
    select: { id: true, r2_url: true },
  });

  let updated = 0;
  for (const asset of assets) {
    await prisma.assets.update({
      where: { id: asset.id },
      data: { r2_url: asset.r2_url.replace(OLD, NEW) },
    });
    updated++;
  }

  return Response.json({ found: assets.length, updated });
}
