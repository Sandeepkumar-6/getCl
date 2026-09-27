import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { User, Vehicle, Policy, Claim } from "../src/models/index.js";
import { removeStoredFile } from "../src/middleware/uploads.js";
import { vehicleCatalogUrl } from "../../client/src/utils/vehicleImages.js";

process.env.JWT_SECRET = "isolated-vehicle-image-test";
process.env.NODE_ENV = "test";
let database, vehicle, owner, ownerToken, otherToken, surveyorToken, adminToken;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2Z38AAAAASUVORK5CYII=", "base64");
const headers = (token) => ({ Authorization: `Bearer ${token}` });

before(async () => {
  database = await MongoMemoryServer.create();
  process.env.MONGO_URI = database.getUri("vehicle_image_test");
  await connectDB();
  const users = await User.create(["POLICYHOLDER", "POLICYHOLDER", "SURVEYOR", "ADMIN"].map((role, index) => ({ name: `Image User ${index}`, email: `image-${index}@example.in`, phone: `987650000${index}`, password: "unused", role, status: "ACTIVE", emailVerifiedAt: new Date() })));
  [owner] = users;
  [ownerToken, otherToken, surveyorToken, adminToken] = users.map((user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET));
  vehicle = await Vehicle.create({ owner: owner._id, registrationNumber: "MH01IM2026", manufacturer: "Hyundai", model: "Creta", manufacturingYear: 2024 });
  const policy = await Policy.create({ policyholder: owner._id, vehicle: vehicle._id, policyNumber: "IMAGE-TEST", insurer: "Test", startDate: "2026-01-01", expiryDate: "2027-01-01" });
  await Claim.create({ claimNumber: "IMAGE-CLAIM", policyholder: owner._id, vehicle: vehicle._id, policy: policy._id, assignedSurveyor: users[2]._id, status: "SUBMITTED" });
});

after(async () => {
  const current = await Vehicle.findById(vehicle._id).select("+photo.storedName +photo.storageKey +photo.storageProvider");
  if (current?.photo) await removeStoredFile(current.photo);
  await disconnectDB();
  await database?.stop();
});

test("future models and colours map to the CDN without forwarding personal identifiers", () => {
  const url = new URL(vehicleCatalogUrl({ manufacturer: "Mahindra", model: "XUV 700", manufacturingYear: 2025, color: "Everest White", paintCode: "P01", registrationNumber: "PRIVATE", owner: "PRIVATE", fuelType: "Diesel" }, "own-customer-id"));
  assert.equal(url.origin, "https://cdn.imagin.studio");
  assert.equal(url.searchParams.get("make"), "mahindra");
  assert.equal(url.searchParams.get("modelFamily"), "xuv-700");
  assert.equal(url.searchParams.get("paintDescription"), "everest-white");
  assert.equal(url.searchParams.get("paintId"), "P01");
  assert.equal(url.searchParams.get("modelYear"), "2025");
  assert.equal(url.href.includes("PRIVATE"), false);
  assert.equal(vehicleCatalogUrl({ manufacturer: "Tata", model: "Nexon" }, ""), null);
  assert.equal(vehicleCatalogUrl({ manufacturer: "Honda", model: "Test", vehicleType: "Motorcycle" }, "own-key"), null);
  const escaped = new URL(vehicleCatalogUrl({ manufacturer: "Test", model: "Model &customer=other" }, "own-key"));
  assert.deepEqual(escaped.searchParams.getAll("customer"), ["own-key"]);
});

test("vehicle photos are private, replaceable, image-only and hidden storage fields remain private", async () => {
  const path = `/api/vehicles/${vehicle._id}/photo`;
  assert.equal((await request(app).post(path).set(headers(otherToken)).attach("file", png, "car.png")).status, 404);
  assert.equal((await request(app).post(path).set(headers(ownerToken)).attach("file", Buffer.from("%PDF-1.4"), "car.pdf")).status, 422);
  assert.equal((await request(app).post(path).set(headers(ownerToken)).attach("file", Buffer.from("not an image"), "car.png")).status, 422);
  const uploaded = await request(app).post(path).set(headers(ownerToken)).attach("file", png, "car.png");
  assert.equal(uploaded.status, 200, JSON.stringify(uploaded.body));
  assert.ok(uploaded.body.photo.version);
  assert.equal(uploaded.body.photo.storedName, undefined);
  assert.equal((await request(app).get(path)).status, 401);
  assert.equal((await request(app).get(path).set(headers(otherToken))).status, 404);
  for (const token of [ownerToken, surveyorToken, adminToken]) {
    const image = await request(app).get(path).set(headers(token));
    assert.equal(image.status, 200);
    assert.match(image.headers["content-type"], /image\/png/);
    assert.equal(image.headers["cache-control"], "private, no-store");
  }
  for (const route of [`/api/vehicles/${vehicle._id}`, "/api/vehicles?includePolicies=true&includeOpenClaim=true", "/api/claims"]) {
    const result = await request(app).get(route).set(headers(ownerToken));
    assert.equal(result.status, 200);
    assert.equal(JSON.stringify(result.body).includes("storedName"), false, route);
    assert.equal(JSON.stringify(result.body).includes("storageKey"), false, route);
  }
  const replacement = await request(app).post(path).set(headers(ownerToken)).attach("file", png, "replacement.png");
  assert.equal(replacement.status, 200);
  assert.notEqual(replacement.body.photo.version, uploaded.body.photo.version);
  assert.equal(replacement.body.photo.originalName, "replacement.png");
});

test("appearance can change for a claimed vehicle without modifying protected identity", async () => {
  const route = `/api/vehicles/${vehicle._id}/appearance`;
  assert.equal((await request(app).patch(route).set(headers(otherToken)).send({ color: "White" })).status, 404);
  assert.equal((await request(app).patch(route).set(headers(ownerToken)).send({ color: "" })).status, 422);
  const updated = await request(app).patch(route).set(headers(ownerToken)).send({ color: "Atlas White", paintCode: "WAW", registrationNumber: "CHANGED" });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.color, "Atlas White");
  assert.equal(updated.body.paintCode, "WAW");
  assert.equal(updated.body.registrationNumber, vehicle.registrationNumber);
  const list = await request(app).get("/api/vehicles?includePolicies=true&includeOpenClaim=true").set(headers(ownerToken));
  const rows = list.body.items || list.body;
  assert.equal(rows[0].openClaim.claimNumber, "IMAGE-CLAIM");
});
