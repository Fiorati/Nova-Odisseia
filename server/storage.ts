import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.S3_REGION || "auto";
const bucket = process.env.S3_BUCKET || "";

const s3 = new S3Client({
  region,
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
    ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
    : undefined,
});

function assertStorageConfig() {
  if (!bucket) throw new Error("S3_BUCKET is not configured.");
  if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) throw new Error("S3 credentials are not configured.");
}

function normalizeKey(value: string) { return value.replace(/^\/+/, ""); }
function appendHashSuffix(key: string) {
  const hash = randomUUID().replaceAll("-", "").slice(0, 8);
  const dot = key.lastIndexOf(".");
  return dot === -1 ? `${key}_${hash}` : `${key.slice(0, dot)}_${hash}${key.slice(dot)}`;
}

export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream") {
  assertStorageConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  return { key, url: `/storage/${key}` };
}

export async function storageGet(relKey: string) {
  const key = normalizeKey(relKey);
  return { key, url: `/storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string, expiresIn = 3600) {
  assertStorageConfig();
  const key = normalizeKey(relKey);
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}
