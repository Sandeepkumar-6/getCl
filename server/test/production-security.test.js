import { test } from "node:test";
import assert from "node:assert/strict";
import { productionConfigErrors } from "../src/config/production.js";

test("production refuses development defaults and accepts a complete deployment configuration", () => {
  const valid = {
    NODE_ENV: "production", JWT_SECRET: "a".repeat(64), CLIENT_URL: "https://claims.example.com",
    MONGO_URI: "mongodb+srv://user:password@cluster.example.com/getclaim_prod",
    STORAGE_DRIVER: "s3", S3_BUCKET: "private-claims", EMAIL_TRANSPORT: "smtp",
    SMTP_HOST: "mail.example.com", SMTP_USER: "user", SMTP_PASS: "password",
    EMAIL_FROM: "claims@example.com",
  };
  assert.deepEqual(productionConfigErrors(valid), []);
  const httpsEmail = { ...valid, EMAIL_TRANSPORT: "resend", RESEND_API_KEY: "test-key", SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "" };
  assert.deepEqual(productionConfigErrors(httpsEmail), []);
  assert.ok(productionConfigErrors({ ...httpsEmail, RESEND_API_KEY: "" }).some(error => error.includes("email")));
  assert.ok(productionConfigErrors({ ...valid, CLIENT_URL: "http://localhost:5173" }).length >= 1);
});
