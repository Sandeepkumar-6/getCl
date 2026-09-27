import mongoose from "mongoose";
import dotenv from "dotenv";
import assert from "node:assert/strict";
import * as M from "../server/src/models/index.js";

dotenv.config({ path: "server/.env" });
try {
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getclaim_db",
    { serverSelectionTimeoutMS: 5000 },
  );
  const customer = await M.User.findOne({ email: "customer@getclaim.in" });
  assert(customer, "Demo policyholder is missing.");
  const superAdmins = await M.User.find({ role: "SUPER_ADMIN" });
  assert.equal(
    superAdmins.length,
    1,
    "Seed must contain exactly one Super Admin.",
  );
  assert.equal(superAdmins[0].email, "superadmin@getclaim.in");
  assert.equal(superAdmins[0].status, "ACTIVE");
  const vehicles = await M.Vehicle.find({
    owner: customer._id,
    archived: { $ne: true },
  });
  const policies = await M.Policy.find({
    policyholder: customer._id,
    archived: { $ne: true },
  });
  assert.equal(
    vehicles.length,
    3,
    "Demo policyholder must own three vehicles.",
  );
  assert.equal(
    policies.length,
    3,
    "Demo policyholder must own three policies.",
  );
  const vehicleIds = new Set(vehicles.map((v) => String(v._id)));
  assert(
    policies.every((p) => vehicleIds.has(String(p.vehicle))),
    "A policy references a missing or foreign vehicle.",
  );
  const [orphanClaims, orphanPolicies, orphanAssignments] = await Promise.all([
    M.Claim.aggregate([
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicle",
          foreignField: "_id",
          as: "v",
        },
      },
      {
        $lookup: {
          from: "policies",
          localField: "policy",
          foreignField: "_id",
          as: "p",
        },
      },
      { $match: { $or: [{ v: { $size: 0 } }, { p: { $size: 0 } }] } },
      { $count: "count" },
    ]),
    M.Policy.aggregate([
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicle",
          foreignField: "_id",
          as: "v",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "policyholder",
          foreignField: "_id",
          as: "u",
        },
      },
      { $match: { $or: [{ v: { $size: 0 } }, { u: { $size: 0 } }] } },
      { $count: "count" },
    ]),
    M.Claim.aggregate([
      { $match: { assignedSurveyor: { $ne: null } } },
      {
        $lookup: {
          from: "users",
          localField: "assignedSurveyor",
          foreignField: "_id",
          as: "s",
        },
      },
      { $match: { s: { $size: 0 } } },
      { $count: "count" },
    ]),
  ]);
  assert.equal(
    orphanClaims[0]?.count || 0,
    0,
    "Orphan claim references found.",
  );
  assert.equal(
    orphanPolicies[0]?.count || 0,
    0,
    "Orphan policy references found.",
  );
  assert.equal(
    orphanAssignments[0]?.count || 0,
    0,
    "Orphan surveyor assignments found.",
  );
  console.log(
    JSON.stringify(
      {
        policyholder: customer.email,
        superAdmin: superAdmins[0].email,
        superAdminCount: superAdmins.length,
        vehicles: vehicles.map((v) => ({
          registrationNumber: v.registrationNumber,
          owner: String(v.owner),
        })),
        policies: policies.map((p) => ({
          policyNumber: p.policyNumber,
          vehicle: String(p.vehicle),
          policyholder: String(p.policyholder),
          active: p.active,
        })),
        claims: await M.Claim.countDocuments(),
        orphanClaims: 0,
        orphanPolicies: 0,
        orphanAssignments: 0,
      },
      null,
      2,
    ),
  );
} finally {
  await mongoose.disconnect();
}
