import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { ResendEmailAdapter, SmtpEmailAdapter, smtpConfigErrors } from "../src/services/email.js";

// A minimal SMTP server that records the DATA section of each message.
const received = [];
let server;
let port;

test("HTTPS email sends account links and refuses rejected or unconfirmed delivery", async () => {
  const env = { RESEND_API_KEY: "test-provider-key", EMAIL_FROM: "claims@example.test" };
  const message = { to: "person@example.test", subject: "Verify email", text: "https://claims.example.test/verify-email?token=test" };
  const adapter = new ResendEmailAdapter(env, async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options.headers.Authorization, "Bearer test-provider-key");
    assert.deepEqual(JSON.parse(options.body), { ...message, to: [message.to], from: env.EMAIL_FROM });
    assert.ok(options.signal);
    return { ok: true, json: async () => ({ id: "email-123" }) };
  });
  assert.deepEqual(await adapter.send(message), { delivered: true, messageId: "email-123" });
  const rejected = new ResendEmailAdapter(env, async () => ({ ok: false, status: 429 }));
  await assert.rejects(rejected.send(message), /rejected delivery \(429\)/);
  const incomplete = new ResendEmailAdapter(env, async () => ({ ok: true, json: async () => ({}) }));
  await assert.rejects(incomplete.send(message), /did not confirm delivery/);
  assert.throws(() => new ResendEmailAdapter({}), /RESEND_API_KEY/);
});

before(async () => {
  server = net.createServer((socket) => {
    let inData = false;
    let buffer = "";
    let body = "";
    socket.write("220 test ESMTP\r\n");
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      let index;
      while ((index = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (inData) {
          if (line === ".") {
            inData = false;
            received.push(body);
            body = "";
            socket.write("250 queued\r\n");
          } else body += `${line}\n`;
        } else if (/^(EHLO|HELO)/i.test(line)) socket.write("250 test\r\n");
        else if (/^DATA/i.test(line)) {
          inData = true;
          socket.write("354 go ahead\r\n");
        } else if (/^QUIT/i.test(line)) socket.end("221 bye\r\n");
        else socket.write("250 ok\r\n");
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
});

after(() => server.close());

test("SMTP config requires a host and a sender", () => {
  assert.deepEqual(smtpConfigErrors({}), [
    "SMTP_HOST is required when EMAIL_TRANSPORT=smtp.",
    "EMAIL_FROM is required when EMAIL_TRANSPORT=smtp.",
  ]);
  assert.deepEqual(smtpConfigErrors({ SMTP_HOST: "smtp.example.test", EMAIL_FROM: "a@example.test" }), []);
  assert.throws(() => SmtpEmailAdapter.fromEnv({}), /SMTP_HOST is required/);
});

test("SMTP adapter delivers the message over SMTP", async () => {
  process.env.EMAIL_FROM = "getClaim <no-reply@example.test>";
  const adapter = SmtpEmailAdapter.fromEnv({
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(port),
    SMTP_SECURE: "false",
    EMAIL_FROM: process.env.EMAIL_FROM,
  });
  adapter.transporter.options.ignoreTLS = true;
  const result = await adapter.send({
    to: "policyholder@example.test",
    subject: "Verify your getClaim email",
    text: "Verify here: http://localhost:5173/verify-email?token=abc",
  });
  assert.equal(result.delivered, true);
  assert.equal(received.length, 1);
  assert.match(received[0], /To: policyholder@example\.test/);
  assert.match(received[0], /Subject: Verify your getClaim email/);
  assert.match(received[0], /verify-email\?token=abc/);
});
