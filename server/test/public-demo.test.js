import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { User } from "../src/models/index.js";
import { productionConfigErrors } from "../src/config/production.js";

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.MONGO_URI = "mongodb://127.0.0.1:27017/getclaim_public_demo_test";
  process.env.JWT_SECRET = "isolated-test-secret-".repeat(4);
  await connectDB();
  process.env.NODE_ENV = "production";
  process.env.PUBLIC_DEMO = "true";
});
after(async () => { await disconnectDB(); });

test("college demo saves a new account, signs in and retains production cookie security", async () => {
  const identity = { name: "Demo Student", email: `student_${randomUUID().slice(0,8)}@demo.getclaim.invalid`, phone: "9999999999", password: "StudentPassword@123", role: "SUPER_ADMIN" };
  const created = await request(app).post("/api/auth/register").send(identity);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.user.role, "POLICYHOLDER");
  assert.equal(created.body.user.emailVerified, true);
  assert.equal(created.body.token, undefined);
  assert.equal(created.body.user.password, undefined);
  const stored = await User.findOne({ email: identity.email }).select("+password");
  assert.ok(stored);
  assert.notEqual(stored.password, identity.password);
  const login = await request(app).post("/api/auth/login").send({ email: identity.email, password: identity.password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  const sessionCookie = login.headers["set-cookie"].find(cookie => cookie.startsWith("__Host-getclaim-session="));
  assert.match(sessionCookie, /HttpOnly/);
  assert.match(sessionCookie, /Secure/);
  assert.match(sessionCookie, /SameSite=Strict/);
  const me = await request(app).get("/api/auth/me").set("Cookie", sessionCookie.split(";")[0]);
  assert.equal(me.status, 200);
  assert.equal(me.body._id, created.body.user._id);
  const wrong = await request(app).post("/api/auth/login").send({ email: identity.email, password: "incorrect" });
  assert.equal(wrong.status, 401);
  const realEmail = await request(app).post("/api/auth/register").send({ ...identity, email: "student@example.com" });
  assert.equal(realEmail.status, 422);
});

test("college demo blocks file uploads and email recovery, and requires an isolated database", async () => {
  assert.equal((await request(app).post("/api/auth/forgot-password").send({ email: "student_test@demo.getclaim.invalid" })).status, 403);
  assert.equal((await request(app).post("/api/vehicles/example/photo").attach("file", Buffer.from("fake-file"), "demo.png")).status, 403);
  const env = { NODE_ENV: "production", PUBLIC_DEMO: "true", JWT_SECRET: "x".repeat(64), CLIENT_URL: "https://claims.example.com", MONGO_URI: "mongodb+srv://user:pass@cluster.example.com/getclaim_prod" };
  assert.deepEqual(productionConfigErrors(env), []);
  assert.ok(productionConfigErrors({ ...env, MONGO_URI: "mongodb+srv://user:pass@cluster.example.com/other_db" }).length);
  assert.ok(productionConfigErrors({ ...env, MONGO_URI: "invalid" }).length);
});
