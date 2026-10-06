import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { productionConfigErrors } from "../src/config/production.js";
import { scanUpload } from "../src/services/scan.js";

test("production refuses development defaults and accepts a complete deployment configuration", () => {
  const valid = {
    NODE_ENV: "production", JWT_SECRET: "a".repeat(64), CLIENT_URL: "https://claims.example.com",
    MONGO_URI: "mongodb+srv://user:password@cluster.example.com/getclaim_prod",
    STORAGE_DRIVER: "s3", S3_BUCKET: "private-claims", EMAIL_TRANSPORT: "smtp",
    SMTP_HOST: "mail.example.com", SMTP_USER: "user", SMTP_PASS: "password",
    EMAIL_FROM: "claims@example.com", CLAMAV_HOST: "scanner.internal",
  };
  assert.deepEqual(productionConfigErrors(valid), []);
  const httpsEmail = { ...valid, EMAIL_TRANSPORT: "resend", RESEND_API_KEY: "test-key", SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "" };
  assert.deepEqual(productionConfigErrors(httpsEmail), []);
  assert.ok(productionConfigErrors({ ...httpsEmail, RESEND_API_KEY: "" }).some(error => error.includes("email")));
  assert.ok(productionConfigErrors({ ...valid, CLIENT_URL: "http://localhost:5173", CLAMAV_HOST: "" }).length >= 2);
});

test("upload scan accepts a clean result and rejects malware or unavailable scanner", async () => {
  const originalHost = process.env.CLAMAV_HOST;
  const originalPort = process.env.CLAMAV_PORT;
  const server = net.createServer(socket => {
    let data = Buffer.alloc(0);
    socket.on("data", chunk => {
      data = Buffer.concat([data, chunk]);
      if (data.length >= 4 && data.subarray(data.length - 4).equals(Buffer.alloc(4)))
        socket.end(data.includes(Buffer.from("infected")) ? "stream: Test.Virus FOUND\0" : "stream: OK\0");
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  process.env.CLAMAV_HOST = "127.0.0.1";
  process.env.CLAMAV_PORT = String(server.address().port);
  try {
    await scanUpload(Buffer.from("clean"));
    await assert.rejects(scanUpload(Buffer.from("infected")), { status: 422 });
    await new Promise(resolve => server.close(resolve));
    await assert.rejects(scanUpload(Buffer.from("clean")), { status: 503 });
  } finally {
    process.env.CLAMAV_HOST = originalHost;
    process.env.CLAMAV_PORT = originalPort;
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
});
