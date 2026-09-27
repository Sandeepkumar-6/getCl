import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission } from "../src/config/permissions.js";
import { customerWorkflow } from "../src/services/workflow.js";

test("central permissions preserve role boundaries and super-admin claim access", () => {
  assert.equal(hasPermission("POLICYHOLDER", "vehicle:own"), true);
  assert.equal(hasPermission("POLICYHOLDER", "claim:operate"), false);
  assert.equal(hasPermission("SURVEYOR", "inspection:assigned"), true);
  assert.equal(hasPermission("ADMIN", "staff:govern"), false);
  assert.equal(hasPermission("SUPER_ADMIN", "claim:operate"), true);
  assert.equal(hasPermission("SUPER_ADMIN", "staff:govern"), true);
});

test("customer claim projection answers status, handler, next step, deadline, and owner", () => {
  const dueAt = new Date(Date.now() + 3600000);
  const projection = customerWorkflow({
    status: "INSPECTION_SCHEDULED",
    assignedSurveyor: { name: "Aditi Kulkarni" },
    dueAt,
    submittedAt: new Date(Date.now() - 7200000),
  });
  assert.equal(projection.stage, "Survey");
  assert.equal(projection.happening, "Survey scheduled");
  assert.equal(projection.handler, "Surveyor: Aditi Kulkarni");
  assert.equal(projection.next, "Vehicle inspection");
  assert.equal(projection.actionOwner, "Surveyor");
  assert.equal(projection.dueAt, dueAt);
  assert.ok(projection.ageHours >= 2);
});
