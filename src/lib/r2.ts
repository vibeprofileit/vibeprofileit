import { S3Client } from "@aws-sdk/client-s3";

console.log("--- R2 YAPILANDIRMA KONTROLÜ ---");
console.log("ID:", process.env.R2_ACCOUNT_ID ? "✅ Dolu" : "❌ EKSİK");
console.log("Bucket Name:", process.env.R2_BUCKET_NAME ? "✅ Dolu" : "❌ EKSİK");
console.log("Public URL:", process.env.R2_PUBLIC_URL ? "✅ Dolu" : "❌ EKSİK");
console.log("--------------------------------");

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucketName = process.env.R2_BUCKET_NAME || "";
const publicUrl = process.env.R2_PUBLIC_URL || "";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

export const R2_BUCKET = bucketName;
export const R2_PUBLIC_URL = publicUrl;