import { ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function POST() {
  const deny = await requireAdmin(); if (deny) return deny;
  // DB'deki tüm r2Key'leri al (tüm statuslar)
  const dbArtworks = await prisma.artwork.findMany({
    select: { id: true, r2Key: true },
    where: { r2Key: { not: null } },
  });
  const dbKeys = new Set(dbArtworks.map((a) => a.r2Key as string));

  // R2'deki tüm dosyaları listele (sayfalama ile)
  const r2Keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) r2Keys.push(obj.Key);
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  const r2KeySet = new Set(r2Keys);

  // Yetim dosyaları bul: R2'de var ama DB'de yok → R2'den sil
  // generations/ klasörü assets tablosunda, artwork tablosunda değil — orphan sayma
  const orphanR2Keys = r2Keys.filter((key) => !dbKeys.has(key) && !key.startsWith("generations/"));

  const deletedFiles: string[] = [];
  const fileErrors: { key: string; error: string }[] = [];

  for (const key of orphanR2Keys) {
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
      deletedFiles.push(key);
      console.log(`[CLEANUP] R2 dosyası silindi: ${key}`);
    } catch (err) {
      fileErrors.push({ key, error: (err as Error).message });
      console.error(`[CLEANUP] R2 dosyası silinemedi: ${key}`, err);
    }
  }

  // Hayalet kayıtları bul: DB'de var ama R2'de yok → DB'den sil
  const ghostArtworks = dbArtworks.filter((a) => !r2KeySet.has(a.r2Key!));
  const ghostIds = ghostArtworks.map((a) => a.id);

  let deletedRecords = 0;
  const recordErrors: { id: string; error: string }[] = [];

  if (ghostIds.length > 0) {
    try {
      const result = await prisma.artwork.deleteMany({ where: { id: { in: ghostIds } } });
      deletedRecords = result.count;
      console.log(`[CLEANUP] ${deletedRecords} hayalet DB kaydı silindi`);
    } catch (err) {
      for (const id of ghostIds) {
        recordErrors.push({ id, error: (err as Error).message });
      }
      console.error("[CLEANUP] Hayalet kayıt silme hatası:", err);
    }
  }

  return Response.json({
    r2Total: r2Keys.length,
    dbTotal: dbKeys.size,
    orphansFound: orphanR2Keys.length,
    deleted: deletedFiles.length,
    errors: fileErrors.length,
    ghostRecordsFound: ghostIds.length,
    deletedRecords,
  });
}
