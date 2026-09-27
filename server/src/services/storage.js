import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { assert } from "../utils/errors.js";

let client;
const driver = () => process.env.STORAGE_DRIVER || "local";
const bucket = () => process.env.S3_BUCKET;
const s3 = () => client ||= new S3Client({
  region: process.env.S3_REGION || "ap-south-1",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
});

export async function putObject({ key, body, contentType, localDir }) {
  if (driver() === "s3") {
    assert(bucket(), 500, "S3_BUCKET is required when STORAGE_DRIVER=s3.");
    await s3().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }));
    return { storageProvider: "s3", storageKey: key };
  }
  assert(process.env.NODE_ENV !== "production", 500, "Durable object storage is required in production. Configure STORAGE_DRIVER=s3.");
  await fs.mkdir(localDir, { recursive: true });
  await fs.writeFile(path.join(localDir, key), body);
  return { storageProvider: "local", storageKey: key };
}

export async function deleteObject(record, localDir) {
  const key = record?.storageKey || record?.storedName || record;
  if (!key || typeof key !== "string") return;
  if ((record?.storageProvider || driver()) === "s3") {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
    return;
  }
  await fs.unlink(path.join(localDir, path.basename(key))).catch(() => {});
}

export async function sendObject(res, record, localDir) {
  const key = record.storageKey || record.storedName;
  res.attachment(record.originalName);
  if ((record.storageProvider || "local") === "s3") {
    const object = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    if (object.ContentType) res.type(object.ContentType);
    if (object.ContentLength) res.set("Content-Length", String(object.ContentLength));
    return object.Body.pipe(res);
  }
  return res.sendFile(path.join(localDir, path.basename(key)));
}
