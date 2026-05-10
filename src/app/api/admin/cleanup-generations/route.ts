import { NextResponse }      from "next/server";
import { getServerSession } from "next-auth";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { authOptions }      from "@/app/api/auth/[...nextauth]/route";
import { prisma }           from "@/lib/prisma";
import { r2, R2_BUCKET }    from "@/lib/r2";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expired = await prisma.assets.findMany({
    where: { expires_at: { lt: new Date() } },
    select: { id: true, r2_key: true },
  });

  if (expired.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  // R2'den sil
  await Promise.allSettled(
    expired.map(asset =>
      r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: asset.r2_key }))
    )
  );

  // DB'den sil
  await prisma.assets.deleteMany({
    where: { id: { in: expired.map(a => a.id) } },
  });

  return NextResponse.json({ deleted: expired.length });
}
