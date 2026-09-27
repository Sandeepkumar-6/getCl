import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { User, Vehicle, Policy, Notification, Claim, Decision } from "../src/models/index.js";
import { stats } from "../src/services/stats.js";
import { notifyUsers } from "../src/services/notifications.js";
import { ConsoleEmailAdapter, setEmailAdapter } from "../src/services/email.js";
import { ConsoleSmsAdapter, setSmsAdapter } from "../src/services/sms.js";

process.env.JWT_SECRET = "isolated-pagination-test-secret";
process.env.NODE_ENV = "test";
let owner, other, admin, admin2, token, database;
before(async () => {
  database = await MongoMemoryServer.create();
  process.env.MONGO_URI = database.getUri("getclaim_pagination_test");
  await connectDB();
  for (const model of [User, Vehicle, Policy, Notification, Claim, Decision]) await model.deleteMany({});
  [owner, other, admin, admin2] = await User.create(["POLICYHOLDER", "POLICYHOLDER", "ADMIN", "ADMIN"].map((role, i) => ({ name: `Pagination ${i}`, email: `pagination${i}@example.in`, phone: "9876543210", password: "unused", role, status: "ACTIVE", emailVerifiedAt: new Date() })));
  token = jwt.sign({ id: owner._id }, process.env.JWT_SECRET);
});
after(async () => { await disconnectDB(); await database?.stop(); });
const get = (path, auth = token) => request(app).get(`/api${path}`).set("Authorization", `Bearer ${auth}`);

test("vehicle and policy pagination keeps ownership and linked policies", async () => {
  const vehicles = await Vehicle.create(Array.from({ length: 4 }, (_, i) => ({ owner: i === 3 ? other._id : owner._id, registrationNumber: `MH01PG${1000 + i}`, manufacturer: "Test", model: "Car" })));
  await Policy.create({ policyholder: owner._id, vehicle: vehicles[0]._id, policyNumber: "PAGINATION-1", insurer: "Test", coverageType: "Comprehensive", startDate: new Date("2026-01-01"), expiryDate: new Date("2027-12-31"), insuredDeclaredValue: 10000000 });
  const first = await get("/vehicles?page=1&limit=2&includePolicies=true");
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.total, 3);
  assert.equal(first.body.pages, 2);
  assert.equal(first.body.items.length, 2);
  assert.equal(first.body.items[0].policies.length, 1);
  const second = await get("/vehicles?page=2&limit=2");
  assert.equal(second.body.items.length, 1);
  assert.ok(!first.body.items.some(v => v._id === second.body.items[0]._id));
  const policies = await get("/policies?page=1&limit=1");
  assert.equal(policies.body.total, 1);
  assert.ok(Array.isArray((await get("/vehicles")).body));
  const invalid = await get("/vehicles?page=Infinity&limit=2.5");
  assert.equal(invalid.status, 200);
  assert.equal(invalid.body.page, 1);
});

test("role notifications are read independently and never leak to other roles", async () => {
  const queue = await Notification.create({ recipientRole: "ADMIN", title: "Queue", message: "New work" });
  const auth = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
  const auth2 = jwt.sign({ id: admin2._id }, process.env.JWT_SECRET);
  assert.equal((await get("/notifications?page=1")).body.total, 0);
  assert.equal((await get("/notifications?page=1", auth)).body.total, 1);
  const read = await request(app).patch(`/api/notifications/${queue._id}/read`).set("Authorization", `Bearer ${auth}`);
  assert.equal(read.status, 200, JSON.stringify(read.body));
  assert.equal((await get("/notifications?page=1", auth)).body.items[0].read, true);
  assert.equal((await get("/notifications?page=1", auth2)).body.items[0].read, false);
  assert.equal((await request(app).patch(`/api/notifications/${queue._id}/read`).set("Authorization", `Bearer ${token}`)).status, 404);
});

test("important updates create in-app records and dispatch email and SMS", async () => {
  const email = [], sms = [];
  setEmailAdapter({ send: async (message) => email.push(message) });
  setSmsAdapter({ send: async (message) => sms.push(message) });
  try {
    const [notification] = await notifyUsers({
      recipients: [owner._id],
      title: "Claim submitted",
      message: "Your claim entered verification.",
      category: "CLAIM",
      deepLink: "/portal/claims/example",
    });
    assert.equal(email.length, 1);
    assert.equal(email[0].to, owner.email);
    assert.equal(sms.length, 1);
    assert.equal(sms[0].to, owner.phone);
    assert.match(email[0].text, /portal\/claims\/example/);
    const saved = await Notification.findById(notification._id);
    assert.deepEqual(saved.channels.sort(), ["EMAIL", "IN_APP", "SMS"]);
    assert.equal(saved.delivery.email, "DELIVERED");
    assert.equal(saved.delivery.sms, "DELIVERED");
  } finally {
    setEmailAdapter(new ConsoleEmailAdapter());
    setSmsAdapter(new ConsoleSmsAdapter());
  }
});

test("aggregate dashboard statistics preserve ownership scope", async () => {
  const vehicle = await Vehicle.findOne({ owner: owner._id });
  const policy = await Policy.findOne({ policyholder: owner._id });
  const claim = await Claim.create({ claimNumber: "GC-PAGINATION-1", policyholder: owner._id, vehicle: vehicle._id, policy: policy._id, status: "APPROVED" });
  await Decision.create({ claim: claim._id, decidedBy: admin._id, outcome: "APPROVED", reason: "Test decision", policyClause: "Test clause", payableAmount: 123456 });
  let result;
  await stats({ user: owner }, { json: value => { result = value; } });
  assert.equal(result.total, 1);
  assert.equal(result.counts.APPROVED, 1);
  assert.equal(result.approvedAmount, 123456);
  await stats({ user: other }, { json: value => { result = value; } });
  assert.equal(result.total, 0);
  assert.equal(result.approvedAmount, 0);
});
