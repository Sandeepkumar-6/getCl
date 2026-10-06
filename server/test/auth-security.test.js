import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { User } from "../src/models/index.js";
import { seed } from "../src/seed.js";
import { setEmailAdapter } from "../src/services/email.js";

process.env.JWT_SECRET = "auth-security-test-secret-that-is-not-used-outside-tests";
process.env.NODE_ENV = "test";
const messages = [];

before(async () => {
  process.env.MONGO_URI = "mongodb://127.0.0.1:27017/getclaim_auth_test";
  setEmailAdapter({ send: async (message) => messages.push(message) });
  await connectDB();
  await seed();
});

after(async () => {
  await disconnectDB();
});

const tokenFromMessage = (message, path) => {
  const match = message.text.match(new RegExp(`${path}\\?token=([a-f0-9]+)`));
  assert.ok(match, `Expected ${path} token in email adapter message`);
  return match[1];
};

test("policyholder verification and password reset tokens are single-use", async () => {
  const registration = await request(app).post("/api/auth/register").send({
    name: "Security Test",
    email: "security@example.in",
    phone: "9876500010",
    password: "InitialPass@123",
  });
  assert.equal(registration.status, 201, JSON.stringify(registration.body));
  assert.equal(registration.body.user.emailVerified, false);
  const blocked = await request(app)
    .post("/api/vehicles")
    .set("Authorization", `Bearer ${registration.body.token}`)
    .send({
      registrationNumber: "MH01ST1001",
      manufacturer: "Test",
      model: "Vehicle",
      manufacturingYear: 2025,
      chassisNumber: "SECURITYTEST001",
      engineNumber: "ENGINE001",
      vehicleType: "Car",
      fuelType: "Petrol",
    });
  assert.equal(blocked.status, 403);
  assert.match(blocked.body.message, /verify your email/i);

  const verificationToken = tokenFromMessage(messages.at(-1), "/verify-email");
  const verified = await request(app)
    .post("/api/auth/verify-email")
    .send({ token: verificationToken });
  assert.equal(verified.status, 200);
  assert.ok((await User.findOne({ email: "security@example.in" })).emailVerifiedAt);
  assert.equal(
    (await request(app).post("/api/auth/verify-email").send({ token: verificationToken })).status,
    400,
  );

  const known = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: "security@example.in" });
  const unknown = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: "missing@example.in" });
  assert.equal(known.status, 200);
  assert.equal(known.body.message, unknown.body.message);

  const resetToken = tokenFromMessage(messages.at(-1), "/reset-password");
  const reset = await request(app).post("/api/auth/reset-password").send({
    token: resetToken,
    password: "Replacement@123",
    confirmPassword: "Replacement@123",
  });
  assert.equal(reset.status, 200, JSON.stringify(reset.body));
  assert.equal(
    (
      await request(app).post("/api/auth/reset-password").send({
        token: resetToken,
        password: "AnotherPass@123",
        confirmPassword: "AnotherPass@123",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(app).post("/api/auth/login").send({
        email: "security@example.in",
        password: "Replacement@123",
      })
    ).status,
    200,
  );
});

test("password change version invalidates an older JWT", async () => {
  const login = await request(app).post("/api/auth/login").send({
    email: "customer@getclaim.in",
    password: "Customer@123",
  });
  assert.equal(login.status, 200);
  await User.updateOne(
    { email: "customer@getclaim.in" },
    { $inc: { authVersion: 1 }, $set: { passwordChangedAt: new Date() } },
  );
  const response = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${login.body.token}`);
  assert.equal(response.status, 401);
  assert.match(response.body.message, /password changed/i);
});

test("five failed logins lock a known account without disclosing the lock", async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await request(app).post("/api/auth/login").send({
      email: "rohan@getclaim.in",
      password: "WrongPassword@123",
    });
    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Email or password is incorrect.");
  }
  const locked = await request(app).post("/api/auth/login").send({
    email: "rohan@getclaim.in",
    password: "Customer@123",
  });
  assert.equal(locked.status, 401);
  assert.equal(locked.body.message, "Email or password is incorrect.");
});

test("browser session uses HttpOnly cookie and rejects writes without a matching CSRF token", async () => {
  const browser = request.agent(app);
  const login = await browser.post("/api/auth/login").send({ email: "customer@getclaim.in", password: "Customer@123" });
  assert.equal(login.status, 200);
  const issued = login.headers["set-cookie"];
  assert.ok(issued.some(value => value.startsWith("getclaim-session=") && value.includes("HttpOnly")));
  const csrf = issued.find(value => value.startsWith("getclaim-csrf="))?.match(/^getclaim-csrf=([^;]+)/)?.[1];
  assert.match(csrf, /^[a-f0-9]{64}$/);
  assert.equal((await browser.get("/api/auth/me")).status, 200);
  assert.equal((await browser.post("/api/auth/logout")).status, 403);
  assert.equal((await browser.post("/api/auth/logout").set("X-CSRF-Token", "0".repeat(64))).status, 403);
  assert.equal((await browser.post("/api/auth/logout").set("X-CSRF-Token", csrf)).status, 200);
  assert.equal((await browser.get("/api/auth/me")).status, 401);
  const oldCookies = issued.map(value => value.split(";")[0]).join("; ");
  assert.equal((await request(app).get("/api/auth/me").set("Cookie", oldCookies)).status, 401);
});

test("staff must complete an emailed second factor before a session is issued", async () => {
  process.env.REQUIRE_STAFF_MFA = "true";
  try {
    const browser = request.agent(app);
    const login = await browser.post("/api/auth/login").send({ email: "admin@getclaim.in", password: "Admin@123" });
    assert.equal(login.status, 200);
    assert.equal(login.body.mfaRequired, true);
    assert.equal(login.body.token, undefined);
    assert.equal(login.headers["set-cookie"], undefined);
    assert.equal((await browser.get("/api/auth/me")).status, 401);
    const code = messages.at(-1).text.match(/security code is (\d{8})/i)?.[1];
    assert.match(code, /^\d{8}$/);
    const wrong = await browser.post("/api/auth/complete-mfa").send({ challengeId: login.body.challengeId, code: "99999999" === code ? "88888888" : "99999999" });
    assert.equal(wrong.status, 401);
    const complete = await browser.post("/api/auth/complete-mfa").send({ challengeId: login.body.challengeId, code });
    assert.equal(complete.status, 200);
    assert.equal((await browser.get("/api/auth/me")).status, 200);
    assert.equal((await browser.post("/api/auth/complete-mfa").send({ challengeId: login.body.challengeId, code })).status, 401);
  } finally { delete process.env.REQUIRE_STAFF_MFA; }
});
