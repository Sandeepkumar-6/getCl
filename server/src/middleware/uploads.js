import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { assert } from "../utils/errors.js";
import { deleteObject, putObject, sendObject } from "../services/storage.js";
export const uploadDir = fileURLToPath(
  new URL("../../uploads/", import.meta.url),
);
export function storedPath(storedName) {
  assert(
    storedName && path.basename(storedName) === storedName,
    404,
    "Stored file not found.",
  );
  return path.join(uploadDir, storedName);
}
export async function removeStoredFile(record) {
  await deleteObject(record, uploadDir);
}
export async function sendStoredFile(res, record) {
  assert(record?.storedName || record?.storageKey, 404, "Stored file not found.");
  return sendObject(res, record, uploadDir);
}
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      ![".jpg", ".jpeg", ".png", ".pdf"].includes(ext) ||
      !["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype)
    )
      return cb(
        Object.assign(new Error("Upload a JPG, PNG or PDF file only."), {
          status: 422,
        }),
      );
    cb(null, true);
  },
});
export async function persist(file) {
  assert(file, 422, "Choose a file to upload.");
  const b = file.buffer;
  let ext, mime;
  if (b.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) {
    ext = ".jpg";
    mime = "image/jpeg";
  } else if (
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    ext = ".png";
    mime = "image/png";
  } else if (b.subarray(0, 5).toString() === "%PDF-") {
    ext = ".pdf";
    mime = "application/pdf";
  }
  assert(
    ext && mime === file.mimetype,
    422,
    "File contents do not match a supported image or PDF format.",
  );
  const storedName = crypto.randomUUID() + ext;
  const storage = await putObject({ key: storedName, body: b, contentType: mime, localDir: uploadDir });
  return {
    storedName,
    ...storage,
    mimeType: mime,
    fileSize: file.size,
    originalName: path.basename(file.originalname),
  };
}
