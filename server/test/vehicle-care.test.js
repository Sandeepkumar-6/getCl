import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import {
  Notification,
  Policy,
  Reminder,
  User,
  Vehicle,
  VehicleCheck,
  VehicleDocument,
} from "../src/models/index.js";
import { processVehicleAlerts } from "../src/services/vehicleAlerts.js";
import { setEmailAdapter, ConsoleEmailAdapter } from "../src/services/email.js";
import { setSmsAdapter, ConsoleSmsAdapter } from "../src/services/sms.js";

process.env.JWT_SECRET = "isolated-vehicle-care-test-secret";
process.env.NODE_ENV = "test";

let database, owner, other, vehicle, token, otherToken;
const pdf = Buffer.from("%PDF-1.4\n% getClaim vehicle document\n");
const auth = (value) => ({ Authorization: `Bearer ${value}` });

before(async () => {
  database = await MongoMemoryServer.create();
  process.env.MONGO_URI = database.getUri("getclaim_vehicle_care_test");
  await connectDB();
  [owner, other] = await User.create([
    { name: "Care Owner", email: "care-owner@example.in", phone: "9876500001", password: "unused", role: "POLICYHOLDER", status: "ACTIVE", emailVerifiedAt: new Date() },
    { name: "Care Other", email: "care-other@example.in", phone: "9876500002", password: "unused", role: "POLICYHOLDER", status: "ACTIVE", emailVerifiedAt: new Date() },
  ]);
  vehicle = await Vehicle.create({ owner: owner._id, registrationNumber: "MH01VC2026", manufacturer: "Test", model: "Care", currentOdometer: 25000 });
  token = jwt.sign({ id: owner._id }, process.env.JWT_SECRET);
  otherToken = jwt.sign({ id: other._id }, process.env.JWT_SECRET);
  setEmailAdapter({ send: async () => {} });
  setSmsAdapter({ send: async () => {} });
});

after(async () => {
  setEmailAdapter(new ConsoleEmailAdapter());
  setSmsAdapter(new ConsoleSmsAdapter());
  await disconnectDB();
  await database?.stop();
});

test("mileage can increase but never move backwards", async () => {
  const lower = await request(app).patch(`/api/vehicles/${vehicle._id}/odometer`).set(auth(token)).send({ currentOdometer: 24999 });
  assert.equal(lower.status, 422, JSON.stringify(lower.body));
  const updated = await request(app).patch(`/api/vehicles/${vehicle._id}/odometer`).set(auth(token)).send({ currentOdometer: 25125 });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.currentOdometer, 25125);
  assert.ok(updated.body.lastOdometerUpdatedAt);
  assert.equal((await request(app).patch(`/api/vehicles/${vehicle._id}/odometer`).set(auth(otherToken)).send({ currentOdometer: 26000 })).status, 404);
});

test("service, checks, reminders, and timelines remain separated per vehicle", async () => {
  const secondVehicle = await Vehicle.create({ owner: owner._id, registrationNumber: "MH01VC2027", manufacturer: "Test", model: "Second", currentOdometer: 8000 });
  const firstService = await request(app).post(`/api/vehicles/${vehicle._id}/services`).set(auth(token)).send({ serviceDate: "2026-08-01", odometer: 25200, serviceType: "General service", workshop: "Care Workshop", amount: 100000, parts: ["Oil filter"] });
  assert.equal(firstService.status, 201, JSON.stringify(firstService.body));
  const secondService = await request(app).post(`/api/vehicles/${secondVehicle._id}/services`).set(auth(token)).send({ serviceDate: "2026-08-02", odometer: 8100, serviceType: "Tyre rotation", workshop: "Second Workshop", amount: 50000 });
  assert.equal(secondService.status, 201, JSON.stringify(secondService.body));
  assert.equal((await request(app).post(`/api/vehicles/${vehicle._id}/checks`).set(auth(token)).send({ checkedAt: "2026-08-01", odometer: 25250, tyres: "OK", brakes: "OK", lights: "OK", fluids: "OK", exterior: "NEEDS_ATTENTION", notes: "Small scratch only" })).status, 201);
  assert.equal((await request(app).post(`/api/vehicles/${vehicle._id}/reminders`).set(auth(token)).send({ type: "SERVICE", title: "Future service", dueDate: "2027-09-22", dueOdometer: 99999 })).status, 201);

  const firstCare = await request(app).get(`/api/vehicles/${vehicle._id}/care`).set(auth(token));
  const secondCare = await request(app).get(`/api/vehicles/${secondVehicle._id}/care`).set(auth(token));
  assert.deepEqual(firstCare.body.services.map((item) => item.workshop), ["Care Workshop"]);
  assert.deepEqual(secondCare.body.services.map((item) => item.workshop), ["Second Workshop"]);
  assert.equal(firstCare.body.checks.length, 1);
  assert.equal(secondCare.body.checks.length, 0);
  assert.equal(firstCare.body.reminders.length, 1);
  assert.equal(secondCare.body.reminders.length, 0);
  assert.equal((await request(app).post(`/api/vehicles/${vehicle._id}/services`).set(auth(otherToken)).send({ serviceDate: "2026-08-03", odometer: 26000, serviceType: "Unauthorized", workshop: "Other Workshop", amount: 0 })).status, 404);
  await VehicleCheck.create({ vehicle: secondVehicle._id, owner: owner._id, checkedAt: new Date("2026-09-22T12:00:00.000Z") });
});

test("vehicle documents expose expiry state only to the vehicle owner", async () => {
  const expiryDate = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const uploaded = await request(app)
    .post(`/api/vehicles/${vehicle._id}/documents`)
    .set(auth(token))
    .field("documentType", "PUC")
    .field("title", "Pollution certificate")
    .field("expiryDate", expiryDate)
    .attach("file", pdf, { filename: "puc.pdf", contentType: "application/pdf" });
  assert.equal(uploaded.status, 201, JSON.stringify(uploaded.body));
  assert.equal(uploaded.body.storedName, undefined);

  const care = await request(app).get(`/api/vehicles/${vehicle._id}/care`).set(auth(token));
  assert.equal(care.status, 200, JSON.stringify(care.body));
  assert.equal(care.body.documents[0].status, "EXPIRING_SOON");
  assert.equal(care.body.documents[0].storedName, undefined);
  assert.equal((await request(app).get(`/api/vehicles/${vehicle._id}/care`).set(auth(otherToken))).status, 404);
  assert.equal((await request(app).get(`/api/vehicles/${vehicle._id}/documents/${uploaded.body._id}`).set(auth(otherToken))).status, 404);
  const downloaded = await request(app).get(`/api/vehicles/${vehicle._id}/documents/${uploaded.body._id}`).set(auth(token));
  assert.equal(downloaded.status, 200);
  assert.match(downloaded.headers["content-type"], /application\/pdf/);
  assert.equal((await request(app).delete(`/api/vehicles/${vehicle._id}/documents/${uploaded.body._id}`).set(auth(token))).status, 200);
});

test("automatic care alerts use date or mileage thresholds and do not duplicate", async () => {
  const now = new Date("2026-09-22T12:00:00.000Z");
  vehicle = await Vehicle.findByIdAndUpdate(vehicle._id, { currentOdometer: 25125, nextServiceDueAt: new Date("2026-10-01T12:00:00.000Z") }, { new: true });
  await VehicleCheck.create({ vehicle: vehicle._id, owner: owner._id, checkedAt: new Date("2026-08-01T12:00:00.000Z") });
  const reminder = await Reminder.create({ vehicle: vehicle._id, owner: owner._id, type: "SERVICE", title: "Engine service", dueDate: new Date("2026-12-01T12:00:00.000Z"), dueOdometer: 25000 });
  await Policy.create({ policyholder: owner._id, vehicle: vehicle._id, policyNumber: "VC-ALERT-2026", insurer: "Test", startDate: new Date("2026-01-01"), expiryDate: new Date("2026-10-02T12:00:00.000Z"), insuredDeclaredValue: 50000000 });
  await VehicleDocument.create({ vehicle: vehicle._id, owner: owner._id, documentType: "PUC", title: "PUC", expiryDate: new Date("2026-09-30T12:00:00.000Z"), originalName: "puc.pdf", storedName: "test-only.pdf", mimeType: "application/pdf", fileSize: 10 });

  const first = await processVehicleAlerts(now);
  assert.equal(first, 5);
  assert.equal((await Reminder.findById(reminder._id)).status, "DUE");
  const eventTypes = (await Notification.find({ recipient: owner._id, eventType: { $exists: true } })).map((item) => item.eventType);
  for (const expected of ["SERVICE_APPROACHING", "SERVICE_DUE", "MONTHLY_CHECK_DUE", "PUC_EXPIRING", "INSURANCE_EXPIRING"])
    assert.ok(eventTypes.includes(expected), `${expected} notification was not created`);
  assert.equal(await processVehicleAlerts(now), 0);
});
