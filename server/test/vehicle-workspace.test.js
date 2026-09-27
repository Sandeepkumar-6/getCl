import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { User, Vehicle, Policy, Claim, AuditLog, Inspection, RepairUpdate, Reminder, ServiceRecord, ClaimDocument, VehicleDocument } from "../src/models/index.js";
import { currentPolicy, activeClaims, vehicleReminders, dayDifference } from "../../client/src/utils/vehicleWorkspace.js";

process.env.JWT_SECRET = "isolated-vehicle-workspace-test";
process.env.NODE_ENV = "test";
let database, users, tokens, vehicles, policy, claim;
const headers = (index = 0) => ({ Authorization: `Bearer ${tokens[index]}` });
before(async () => {
  database = await MongoMemoryServer.create();
  process.env.MONGO_URI = database.getUri("vehicle_workspace_test");
  await connectDB();
  users = await User.create(["POLICYHOLDER", "POLICYHOLDER", "SURVEYOR", "ADMIN", "POLICYHOLDER"].map((role, index) => ({ name: `Workspace ${index}`, email: `workspace-${index}@example.in`, phone: `987640000${index}`, password: "unused", role, status: "ACTIVE", ...(index === 4 ? {} : { emailVerifiedAt: new Date() }) })));
  tokens = users.map(user => jwt.sign({ id: user._id }, process.env.JWT_SECRET));
  vehicles = await Vehicle.create([0, 0, 1, 4].map((owner, index) => ({ owner: users[owner]._id, manufacturer: "Hyundai", model: "Creta", registrationNumber: `MH01WS200${index}`, manufacturingYear: 2024 })));
  policy = await Policy.create({ vehicle: vehicles[0]._id, policyholder: users[0]._id, policyNumber: "WORKSPACE-POLICY", insurer: "Test insurer", startDate: "2025-01-01", expiryDate: "2099-01-01", document: { originalName: "policy.pdf", storedName: "PRIVATE-POLICY", storageKey: "PRIVATE-KEY" } });
  claim = await Claim.create({ claimNumber: "WORKSPACE-CLAIM", policyholder: users[0]._id, vehicle: vehicles[0]._id, policy: policy._id, assignedSurveyor: users[2]._id, status: "MORE_INFORMATION_REQUIRED", submittedAt: new Date("2026-01-01"), accident: { date: "2025-12-31", location: "Pune" } });
});
after(async () => { await disconnectDB(); await database?.stop(); });

test("primary vehicle persists on the account and respects ownership, verification and roles", async () => {
  const path = `/api/vehicles/${vehicles[1]._id}/primary`;
  assert.equal((await request(app).patch(path)).status, 401);
  assert.equal((await request(app).patch(path).set(headers(1))).status, 404);
  assert.equal((await request(app).patch(path).set(headers(2))).status, 403);
  assert.equal((await request(app).patch(path).set(headers(3))).status, 403);
  assert.equal((await request(app).patch(`/api/vehicles/${vehicles[3]._id}/primary`).set(headers(4))).status, 403);
  const saved = await request(app).patch(path).set(headers());
  assert.equal(saved.status, 200);
  const me = await request(app).get("/api/auth/me").set(headers());
  assert.equal(me.body.primaryVehicle, String(vehicles[1]._id));
  await Vehicle.updateOne({ _id: vehicles[1]._id }, { archived: true });
  assert.equal((await request(app).patch(path).set(headers())).status, 404);
  await Vehicle.updateOne({ _id: vehicles[1]._id }, { archived: false });
});

test("vehicle overview combines actual dated history and safe document metadata without leaking other vehicles", async () => {
  const file = { originalName: "sample.pdf", storedName: "PRIVATE-FILE", storageKey: "PRIVATE-KEY", mimeType: "application/pdf" };
  await ServiceRecord.create({ vehicle: vehicles[0]._id, owner: users[0]._id, serviceDate: "2026-02-01", odometer: 1000, serviceType: "Recorded service", workshop: "Test workshop", documents: [file] });
  await ClaimDocument.create({ ...file, claim: claim._id, uploadedBy: users[0]._id, documentType: "Insurance policy" });
  await VehicleDocument.create({ ...file, vehicle: vehicles[0]._id, owner: users[0]._id, title: "PUC certificate", documentType: "PUC", expiryDate: "2099-01-01" });
  await AuditLog.create({ claim: claim._id, actor: users[3]._id, actorRole: "ADMIN", action: "STATUS_CHANGE", note: "Requested missing evidence", timestamp: "2026-03-01" });
  await Inspection.create({ claim: claim._id, surveyor: users[2]._id, scheduledDate: "2026-02-02", submittedAt: "2026-02-03", inspectionLocation: "Pune" });
  await RepairUpdate.create({ claim: claim._id, author: users[3]._id, note: "Recorded repair update" });
  await AuditLog.create({ claim: claim._id, actor: users[3]._id, actorRole: "ADMIN", action: "FUTURE_TEST", timestamp: "2099-01-01" });
  const result = await request(app).get(`/api/vehicles/${vehicles[0]._id}/care`).set(headers());
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.deepEqual(new Set(result.body.documentLibrary.map(doc => doc.category)), new Set(["Vehicle", "Policy", "Claim", "Service"]));
  assert.equal(result.body.policies[0].status, "ACTIVE");
  assert.equal(result.body.claims[0].customerWorkflow.actionOwner, "You");
  assert.equal(result.body.claims[0].policy, String(policy._id));
  assert.equal(JSON.stringify(result.body).includes("PRIVATE-"), false);
  assert.equal(JSON.stringify(result.body).includes("storedName"), false);
  assert.ok(result.body.timeline.some(event => event.type === "INSPECTION"));
  assert.ok(result.body.timeline.some(event => event.title === "Requested missing evidence"));
  assert.ok(result.body.timeline.some(event => event.type === "REPAIR"));
  assert.ok(result.body.timeline.every((entry, i, rows) => new Date(entry.at) <= new Date() && (!i || new Date(rows[i - 1].at) >= new Date(entry.at))));
  const empty = await request(app).get(`/api/vehicles/${vehicles[1]._id}/care`).set(headers());
  for (const key of ["claims", "services", "policies", "documents", "documentLibrary", "reminders"]) assert.deepEqual(empty.body[key], []);
  assert.equal(empty.body.timeline.length, 1);
  assert.equal((await request(app).get(`/api/vehicles/${vehicles[0]._id}/care`).set(headers(1))).status, 404);
  assert.equal((await request(app).get(`/api/vehicles/${vehicles[0]._id}/care`).set(headers(2))).status, 403);
});

test("claim filters and reminder updates stay scoped to the selected vehicle and owner", async () => {
  const matching = await request(app).get(`/api/claims?vehicleId=${vehicles[0]._id}&policyId=${policy._id}`).set(headers());
  assert.equal(matching.body.total, 1);
  const other = await request(app).get(`/api/claims?vehicleId=${vehicles[0]._id}`).set(headers(1));
  assert.equal(other.body.total, 0);
  const empty = await request(app).get(`/api/claims?vehicleId=${vehicles[1]._id}`).set(headers());
  assert.equal(empty.body.total, 0);
  const reminder = await Reminder.create({ vehicle: vehicles[0]._id, owner: users[0]._id, type: "CUSTOM", title: "Test due", dueDate: "2026-02-01" });
  assert.equal((await request(app).patch(`/api/vehicles/${vehicles[1]._id}/reminders/${reminder._id}`).set(headers()).send({ status: "COMPLETED" })).status, 404);
  assert.equal((await request(app).patch(`/api/vehicles/${vehicles[0]._id}/reminders/${reminder._id}`).set(headers(1)).send({ status: "COMPLETED" })).status, 404);
  assert.equal((await request(app).patch(`/api/vehicles/${vehicles[0]._id}/reminders/${reminder._id}`).set(headers()).send({ status: "COMPLETED" })).status, 200);
});

test("dashboard derives reminders only from recorded dates/actions and avoids duplicate saved schedules", () => {
  const empty = { vehicle: { _id: "vehicle", currentOdometer: 0 }, policies: [], claims: [], reminders: [], documents: [] };
  assert.deepEqual(vehicleReminders(empty), []);
  assert.equal(currentPolicy([{ status: "EXPIRED" }, { status: "ACTIVE", _id: "active" }])._id, "active");
  assert.equal(activeClaims([{ status: "SETTLED" }, { status: "DRAFT" }, { status: "SUBMITTED" }]).length, 1);
  assert.equal(dayDifference("2026-03-01T23:59:00", "2026-03-01T01:00:00"), 0);
  const rows = vehicleReminders({ ...empty, vehicle: { _id: "vehicle", currentOdometer: 1000, nextServiceDueAt: "2026-04-01" }, reminders: [{ _id: "r1", type: "SERVICE", title: "Saved service", dueDate: "2026-04-01", status: "UPCOMING" }, { _id: "done", status: "COMPLETED" }, { _id: "mileage", dueOdometer: 900, status: "UPCOMING" }], policies: [{ _id: "p1", status: "ACTIVE", expiryDate: "2027-01-01" }], claims: [{ _id: "c1", status: "MORE_INFORMATION_REQUIRED" }] }, new Date("2026-03-01"));
  assert.equal(rows.filter(row => row.type === "SERVICE").length, 1);
  assert.ok(rows.find(row => row.id === "claim-c1").due);
  assert.ok(rows.find(row => row.id === "reminder-mileage").due);
  assert.equal(rows.some(row => row.id === "reminder-done"), false);
});
