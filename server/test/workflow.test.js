import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { seed } from "../src/seed.js";
import * as M from "../src/models/index.js";
process.env.JWT_SECRET =
  "test-only-secret-that-is-never-used-by-the-running-portal";
process.env.NODE_ENV = "test";
let customer, admin, superadmin, surveyor, other, vehicle, policy, claim;
const call = (method, path, token, body) => {
  const r = request(app)[method]("/api" + path);
  if (token) r.set("Authorization", "Bearer " + token);
  return body ? r.send(body) : r;
};
before(async () => {
  process.env.MONGO_URI =
    process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27017/getclaim_test";
  await connectDB();
  assert.equal(
    mongoose.connection.name,
    "getclaim_test",
    "Tests must run only against getclaim_test",
  );
  await seed();
});
after(async () => {
  await disconnectDB();
});
test("full claim lifecycle, security boundaries and validation", async (t) => {
  await t.test("health and four demo logins", async () => {
    assert.equal((await call("get", "/health")).status, 200);
    for (const [name, pass] of [
      ["customer", "Customer"],
      ["surveyor", "Surveyor"],
      ["admin", "Admin"],
      ["superadmin", "SuperAdmin"],
    ]) {
      const r = await call("post", "/auth/login", null, {
        email: name + "@getclaim.in",
        password: pass + "@123",
      });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.ok(r.body.token);
      assert.equal(r.body.user.password, undefined);
      if (name === "customer") customer = r.body.token;
      if (name === "admin") admin = r.body.token;
      if (name === "surveyor") surveyor = r.body.token;
      if (name === "superadmin") superadmin = r.body.token;
    }
    assert.equal(
      (
        await call("post", "/auth/login", null, {
          email: "customer@getclaim.in",
          password: "wrong",
        })
      ).status,
      401,
    );
    assert.equal(await M.User.countDocuments({ role: "SUPER_ADMIN" }), 1);
    assert.ok(
      await M.User.exists({
        email: "superadmin@getclaim.in",
        role: "SUPER_ADMIN",
      }),
    );
  });
  await t.test(
    "registration forces policyholder and validates duplicates",
    async () => {
      const body = {
        name: "Test Policyholder",
        email: "workflow@example.in",
        phone: "9876543200",
        password: "Testing@123",
        role: "ADMIN",
      };
      const r = await call("post", "/auth/register", null, body);
      assert.equal(r.status, 201);
      assert.equal(r.body.user.role, "POLICYHOLDER");
      assert.equal(r.body.user.status, "ACTIVE");
      other = r.body.token;
      assert.equal(
        (await call("post", "/auth/register", null, body)).status,
        409,
      );
      assert.equal(
        (
          await call("post", "/auth/register", null, {
            ...body,
            email: "bad",
            phone: "123",
          })
        ).status,
        422,
      );
    },
  );
  await t.test("secure staff onboarding and authorization", async () => {
    const verification = Buffer.from("%PDF-1.4\nSurveyor verification\n%%EOF");
    const application = await request(app)
      .post("/api/auth/surveyor-apply")
      .field("name", "Kavya Nair")
      .field("email", "kavya.surveyor@example.in")
      .field("phone", "9876501234")
      .field("password", "Surveyor!234")
      .field("confirmPassword", "Surveyor!234")
      .field("surveyorId", "SURV-9001")
      .field("qualification", "Diploma in Automobile Engineering")
      .field("experience", "4")
      .field("surveyorRegion", "Mumbai Western Region")
      .field("address", "Andheri West, Mumbai, Maharashtra")
      .attach("verificationDocument", verification, {
        filename: "verification.pdf",
        contentType: "application/pdf",
      });
    assert.equal(application.status, 201, JSON.stringify(application.body));
    assert.equal(application.body.application.status, "PENDING");
    assert.equal(
      (
        await call("post", "/auth/login", null, {
          email: "kavya.surveyor@example.in",
          password: "Surveyor!234",
        })
      ).status,
      403,
    );
    assert.equal(
      (await call("get", "/staff/surveyor-applications", customer)).status,
      403,
    );
    const pending = await call(
      "get",
      "/staff/surveyor-applications?status=PENDING",
      admin,
    );
    const applicant = pending.body.find(
      (u) => u.email === "kavya.surveyor@example.in",
    );
    assert.equal(applicant.role, "SURVEYOR");
    assert.equal(applicant.status, "PENDING");
    assert.equal(applicant.verificationDocument.filePath, undefined);
    assert.equal(
      (await call("get", `/staff/${applicant._id}/document`, admin)).status,
      200,
    );
    assert.equal(
      (
        await call("post", "/staff/admins", admin, {
          name: "Illegal Admin",
          email: "illegal.admin@example.in",
          phone: "9876504321",
          employeeId: "EMP-ILLEGAL",
          temporaryPassword: "Temporary!234",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call("patch", `/staff/surveyors/${applicant._id}/review`, admin, {
          decision: "APPROVE",
        })
      ).status,
      200,
    );
    const approvedLogin = await call("post", "/auth/login", null, {
      email: "kavya.surveyor@example.in",
      password: "Surveyor!234",
    });
    assert.equal(approvedLogin.status, 200);
    assert.equal(approvedLogin.body.user.status, "ACTIVE");
    const approvedToken = approvedLogin.body.token;
    const escalation = await call("patch", "/auth/me", approvedToken, {
      name: "Kavya Nair",
      phone: "9876501234",
      address: "Andheri West, Mumbai",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400053",
      role: "SUPER_ADMIN",
    });
    assert.equal(escalation.status, 200);
    assert.equal(escalation.body.role, "SURVEYOR");
    assert.equal(
      (
        await call("patch", `/staff/${applicant._id}/status`, admin, {
          status: "SUSPENDED",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await call("post", "/auth/login", null, {
          email: "kavya.surveyor@example.in",
          password: "Surveyor!234",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call("patch", `/staff/${applicant._id}/status`, admin, {
          status: "ACTIVE",
        })
      ).status,
      200,
    );
    const createdAdmin = await call("post", "/staff/admins", superadmin, {
      name: "Devika Menon",
      email: "devika.admin@example.in",
      phone: "9876505678",
      employeeId: "EMP-ADMIN-101",
      temporaryPassword: "Temporary!234",
    });
    assert.equal(createdAdmin.status, 201, JSON.stringify(createdAdmin.body));
    assert.equal(createdAdmin.body.role, "ADMIN");
    assert.equal(createdAdmin.body.mustChangePassword, true);
    const temporaryLogin = await call("post", "/auth/login", null, {
      email: "devika.admin@example.in",
      password: "Temporary!234",
    });
    assert.equal(temporaryLogin.status, 200);
    assert.equal(
      (await call("get", "/admin/users", temporaryLogin.body.token)).status,
      403,
    );
    const changed = await call(
      "post",
      "/auth/change-password",
      temporaryLogin.body.token,
      {
        currentPassword: "Temporary!234",
        newPassword: "Permanent!567",
        confirmPassword: "Permanent!567",
      },
    );
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.equal(changed.body.user.mustChangePassword, false);
    const permanentLogin = await call("post", "/auth/login", null, {
      email: "devika.admin@example.in",
      password: "Permanent!567",
    });
    assert.equal(permanentLogin.status, 200);
    assert.equal(
      (
        await call("patch", `/staff/${createdAdmin.body._id}/status`, admin, {
          status: "SUSPENDED",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          "patch",
          `/staff/${createdAdmin.body._id}/status`,
          superadmin,
          {
            status: "SUSPENDED",
          },
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          "patch",
          `/staff/${createdAdmin.body._id}/status`,
          superadmin,
          {
            status: "ACTIVE",
          },
        )
      ).status,
      200,
    );
    const reset = await call(
      "post",
      `/staff/${createdAdmin.body._id}/reset-password`,
      superadmin,
    );
    assert.equal(reset.status, 200);
    assert.match(reset.body.temporaryPassword, /[A-Z]/);
    const history = await call(
      "get",
      `/staff/${createdAdmin.body._id}/audit`,
      superadmin,
    );
    assert.equal(history.status, 200);
    assert.ok(
      [
        "STAFF_ROLE_ASSIGNED",
        "STAFF_SUSPENDED",
        "STAFF_REACTIVATED",
        "STAFF_PASSWORD_RESET",
      ].every((action) =>
        history.body.some((event) => event.action === action),
      ),
    );
    const applicationAudit = await M.AuditLog.find({
      targetUser: applicant._id,
    });
    assert.ok(
      ["STAFF_APPROVED", "STAFF_SUSPENDED", "STAFF_REACTIVATED"].every(
        (action) => applicationAudit.some((event) => event.action === action),
      ),
    );
  });
  await t.test("vehicle and policy creation and ownership", async () => {
    const v = await call("post", "/vehicles", customer, {
      registrationNumber: "MH48ZZ1234",
      manufacturer: "Tata",
      model: "Punch",
      manufacturingYear: 2023,
      fuelType: "Petrol",
      vehicleType: "SUV",
      chassisNumber: "TESTCHASSIS123",
      engineNumber: "TESTENGINE123",
    });
    assert.equal(v.status, 201, JSON.stringify(v.body));
    vehicle = v.body;
    assert.equal(
      (await call("get", "/vehicles/" + vehicle._id, other)).status,
      404,
    );
    const p = await call("post", "/policies", customer, {
      vehicle: vehicle._id,
      policyNumber: "TEST-POLICY-001",
      insurer: "Sample insurer",
      coverageType: "Comprehensive",
      claimTypes: ["Cashless", "Reimbursement"],
      startDate: "2020-01-01",
      expiryDate: "2030-01-01",
      insuredDeclaredValue: 600000,
      deductible: 1000,
    });
    assert.equal(p.status, 201, JSON.stringify(p.body));
    policy = p.body;
    assert.equal(
      (await call("get", "/policies?vehicleId=" + vehicle._id, customer)).body
        .length,
      1,
    );
    assert.equal(
      (await call("get", "/policies?vehicleId=" + vehicle._id, other)).status,
      404,
    );
    assert.equal(
      (
        await call("post", "/policies", other, {
          ...p.body,
          policyNumber: "STOLEN",
        })
      ).status,
      403,
    );
    const policyPdf = Buffer.from("%PDF-1.4\nSample policy\n%%EOF");
    const uploaded = await request(app)
      .post(`/api/policies/${policy._id}/document`)
      .set("Authorization", "Bearer " + customer)
      .attach("file", policyPdf, {
        filename: "policy.pdf",
        contentType: "application/pdf",
      });
    assert.equal(uploaded.status, 200, JSON.stringify(uploaded.body));
    assert.equal(uploaded.body.document.originalName, "policy.pdf");
    assert.equal(uploaded.body.document.filePath, undefined);
    assert.equal(
      (await call("get", `/policies/${policy._id}/document`, customer)).status,
      200,
    );
  });
  const body = () => ({
    vehicle: vehicle._id,
    policy: policy._id,
    accident: {
      date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      time: "14:35",
      type: "Collision",
      claimType: "Cashless",
      location: "Vasai West, Mumbai",
      landmark: "Railway station",
      description:
        "The vehicle was travelling slowly near the station when a collision damaged the front bumper and left headlamp. No occupants were injured.",
      weather: "Clear",
      road: "Dry",
      driveable: true,
      injury: false,
      thirdParty: false,
    },
    police: {},
    thirdParty: {},
    declarationAccepted: true,
  });
  await t.test(
    "draft creation, validation and prohibited transitions",
    async () => {
      const r = await call("post", "/claims", customer, body());
      assert.equal(r.status, 201, JSON.stringify(r.body));
      claim = r.body;
      assert.equal(
        (await call("get", "/claims/" + claim._id, other)).status,
        403,
      );
      assert.equal(
        (await call("get", "/claims/" + claim._id, surveyor)).status,
        403,
      );
      assert.equal((await call("get", "/claims/bad-id", admin)).status, 400);
      assert.equal(
        (await call("get", "/claims/" + new mongoose.Types.ObjectId(), admin))
          .status,
        404,
      );
      assert.equal(
        (await call("patch", `/claims/${claim._id}/submit`, customer)).status,
        422,
      );
      assert.equal(
        (
          await call("patch", `/claims/${claim._id}/status`, admin, {
            status: "SETTLED",
            note: "Attempt to bypass the workflow.",
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await call("post", "/claims", customer, {
            ...body(),
            accident: { ...body().accident, date: "2099-01-01" },
          })
        ).status,
        422,
      );
    },
  );
  const pdf = Buffer.from(
    "%PDF-1.4\nSample evidence for automated workflow test\n%%EOF",
  );
  await t.test(
    "real document upload, download, ownership and file restrictions",
    async () => {
      for (const documentType of [
        "Registration Certificate",
        "Driving licence",
        "Insurance policy",
        "Front damage photograph",
      ]) {
        const r = await request(app)
          .post(`/api/claims/${claim._id}/documents`)
          .set("Authorization", "Bearer " + customer)
          .field("documentType", documentType)
          .attach("file", pdf, {
            filename: "test-evidence.pdf",
            contentType: "application/pdf",
          });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        if (documentType === "Registration Certificate") {
          assert.equal(
            (
              await call(
                "get",
                `/claims/${claim._id}/documents/${r.body._id}/download`,
                customer,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await call(
                "get",
                `/claims/${claim._id}/documents/${r.body._id}/download`,
                other,
              )
            ).status,
            403,
          );
        }
      }
      const fake = await request(app)
        .post(`/api/claims/${claim._id}/documents`)
        .set("Authorization", "Bearer " + customer)
        .field("documentType", "Repair estimate")
        .attach("file", Buffer.from("MZ executable"), {
          filename: "fake.pdf",
          contentType: "application/pdf",
        });
      assert.equal(fake.status, 422);
      const large = await request(app)
        .post(`/api/claims/${claim._id}/documents`)
        .set("Authorization", "Bearer " + customer)
        .field("documentType", "Repair estimate")
        .attach("file", Buffer.alloc(8 * 1024 * 1024 + 1), {
          filename: "large.pdf",
          contentType: "application/pdf",
        });
      assert.equal(large.status, 413);
      const exe = await request(app)
        .post(`/api/claims/${claim._id}/documents`)
        .set("Authorization", "Bearer " + customer)
        .field("documentType", "Repair estimate")
        .attach("file", pdf, {
          filename: "unsafe.exe",
          contentType: "application/octet-stream",
        });
      assert.equal(exe.status, 422);
    },
  );
  await t.test("submission and information request response", async () => {
    const d = await call("get", "/claims/" + claim._id, customer);
    assert.equal(d.body.readiness.score, 100);
    assert.equal(d.body.claim.policy.document, undefined);
    assert.equal(
      (await call("patch", `/claims/${claim._id}/submit`, customer)).status,
      200,
    );
    assert.equal(
      (await call("patch", `/claims/${claim._id}/draft`, customer, body()))
        .status,
      409,
    );
    assert.equal(
      (
        await call("patch", `/claims/${claim._id}/status`, customer, {
          status: "UNDER_REVIEW",
          note: "Unauthorised customer status change.",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call("patch", `/claims/${claim._id}/status`, admin, {
          status: "MORE_INFORMATION_REQUIRED",
          note: "Please confirm the accident landmark.",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await call("patch", `/claims/${claim._id}/respond`, customer, {
          response: "The accident occurred outside the west station exit.",
        })
      ).status,
      200,
    );
  });
  await t.test(
    "survey assignment, scheduling and report calculation",
    async () => {
      const surveyors = await call("get", "/admin/surveyors", admin);
      const assigned = surveyors.body.find(
        (u) => u.email === "surveyor@getclaim.in",
      );
      assert.equal(
        (
          await call("patch", `/claims/${claim._id}/assign`, admin, {
            surveyor: assigned._id,
          })
        ).status,
        200,
      );
      assert.equal(
        (await call("get", "/claims/" + claim._id, surveyor)).status,
        200,
      );
      const report = {
        damageSummary: "The bumper and headlamp show collision damage.",
        affectedParts: ["Front bumper", "Headlamp"],
        partsCost: 18000,
        labourCost: 4500,
        taxAmount: 4050,
        recommendedSettlement: 24500,
        notes: "The estimate is a prototype assessment only.",
      };
      assert.equal(
        (
          await call(
            "post",
            `/claims/${claim._id}/inspection`,
            surveyor,
            report,
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await call(
            "post",
            `/claims/${claim._id}/inspection/schedule`,
            surveyor,
            {
              scheduledDate: new Date(Date.now() + 86400000).toISOString(),
              inspectionLocation: "Sample Auto Care, Vasai West",
            },
          )
        ).status,
        201,
      );
      const r = await call(
        "post",
        `/claims/${claim._id}/inspection`,
        surveyor,
        report,
      );
      assert.equal(r.status, 201);
      assert.equal(r.body.estimatedRepairCost, 26550);
    },
  );
  const decision = {
    outcome: "APPROVED",
    reason: "The inspection confirms covered accident damage.",
    policyClause: "Sample OD-4",
  };
  await t.test("approval, settlement and timeline integrity", async () => {
    assert.equal(
      (await call("post", `/claims/${claim._id}/decision`, surveyor, decision))
        .status,
      403,
    );
    const r = await call(
      "post",
      `/claims/${claim._id}/decision`,
      admin,
      decision,
    );
    assert.equal(r.status, 201);
    assert.equal(r.body.payableAmount, 22850);
    assert.equal(
      (
        await call("patch", `/claims/${claim._id}/status`, admin, {
          status: "SETTLED",
          note: "Prototype settlement recorded; no funds transferred.",
        })
      ).status,
      200,
    );
    const d = await call("get", "/claims/" + claim._id, customer);
    assert.equal(d.body.claim.status, "SETTLED");
    const events = d.body.timeline.filter((a) => a.action === "STATUS_CHANGED");
    assert.equal(events.length, 8);
    assert.ok(
      events.every(
        (e) =>
          e.actorRole &&
          e.actor &&
          e.timestamp &&
          e.previousValue &&
          e.newValue,
      ),
    );
  });
  await t.test(
    "rejection, appeal, evidence, review and reopening",
    async () => {
      const c = await M.Claim.findOne({ status: "INSPECTION_COMPLETED" });
      const owner = await M.User.findById(c.policyholder);
      const token = jwt.sign({ id: owner._id }, process.env.JWT_SECRET);
      const r = await call("post", `/claims/${c._id}/decision`, admin, {
        ...decision,
        outcome: "REJECTED",
        reason: "The estimate includes unrelated prior damage.",
      });
      assert.equal(r.status, 201);
      assert.equal(r.body.payableAmount, 0);
      assert.equal(
        (
          await call("post", `/claims/${c._id}/appeal`, token, {
            reason:
              "The workshop report confirms this damage came from the accident.",
            supportingInformation:
              "Please review the new workshop clarification.",
          })
        ).status,
        201,
      );
      assert.equal(
        (
          await call("patch", `/claims/${c._id}/appeal`, admin, {
            status: "REOPENED",
            reviewNote: "New information warrants another surveyor assessment.",
          })
        ).status,
        200,
      );
      assert.equal(
        (await call("get", "/claims/" + c._id, admin)).body.claim.status,
        "UNDER_REVIEW",
      );
    },
  );
  await t.test(
    "theft and third-party claims accept every required evidence type",
    async () => {
      const cases = [
        {
          claimType: "THEFT",
          daysAgo: 3,
          accident: { type: "Theft" },
          documentTypes: [
            "Registration Certificate",
            "Insurance policy",
            "FIR or police report",
            "Keys and theft declaration",
            "Untraced police report",
            "RTO transfer or cancellation papers",
          ],
        },
        {
          claimType: "THIRD_PARTY",
          daysAgo: 4,
          accident: { thirdParty: true },
          police: { number: "FIR-12345", station: "Vasai police station" },
          thirdParty: { name: "Other driver", phone: "9876543210" },
          documentTypes: [
            "Registration Certificate",
            "Insurance policy",
            "Driving licence",
            "FIR or police report",
            "Legal or MACT notice",
          ],
        },
      ];
      for (const scenario of cases) {
        const draft = await call("post", "/claims", customer, {
          ...body(),
          claimType: scenario.claimType,
          accident: {
            ...body().accident,
            date: new Date(Date.now() - scenario.daysAgo * 86400000).toISOString().slice(0, 10),
            ...scenario.accident,
          },
          police: scenario.police || {},
          thirdParty: scenario.thirdParty || {},
        });
        assert.equal(draft.status, 201, JSON.stringify(draft.body));
        for (const documentType of scenario.documentTypes) {
          const upload = await request(app)
            .post(`/api/claims/${draft.body._id}/documents`)
            .set("Authorization", "Bearer " + customer)
            .field("documentType", documentType)
            .attach("file", pdf, {
              filename: "test-evidence.pdf",
              contentType: "application/pdf",
            });
          assert.equal(upload.status, 201, `${documentType}: ${JSON.stringify(upload.body)}`);
        }
        const detail = await call("get", `/claims/${draft.body._id}`, customer);
        assert.equal(detail.body.readiness.score, 100, JSON.stringify(detail.body.readiness));
        const submitted = await call("patch", `/claims/${draft.body._id}/submit`, customer);
        assert.equal(submitted.status, 200, JSON.stringify(submitted.body));
      }
    },
  );
  await t.test(
    "expired policy, authentication and admin restrictions",
    async () => {
      const p = await M.Policy.findOne({
        policyNumber: "BAJAJ-MH-2025-36218",
      });
      const r = await call("post", "/claims", customer, {
        ...body(),
        vehicle: String(p.vehicle),
        policy: String(p._id),
      });
      assert.equal(r.status, 201);
      assert.equal(
        (await call("patch", `/claims/${r.body._id}/submit`, customer)).status,
        422,
      );
      assert.equal((await call("get", "/claims")).status, 401);
      assert.equal(
        (
          await call(
            "get",
            "/claims",
            jwt.sign(
              { id: new mongoose.Types.ObjectId() },
              process.env.JWT_SECRET,
              { expiresIn: -1 },
            ),
          )
        ).status,
        401,
      );
      assert.equal((await call("get", "/admin/users", customer)).status, 403);
      assert.equal((await call("get", "/vehicles", surveyor)).status, 403);
      const users = await call("get", "/admin/users", admin);
      assert.ok(users.body.every((u) => !u.password));
      const otherUser = users.body.find(
        (u) => u.email === "workflow@example.in",
      );
      assert.equal(
        (
          await call(
            "patch",
            "/admin/users/" + otherUser._id + "/status",
            admin,
            { active: false },
          )
        ).status,
        200,
      );
      assert.equal((await call("get", "/auth/me", other)).status, 401);
    },
  );
  await t.test("notifications, statistics, search and pagination", async () => {
    const ns = await call("get", "/notifications", customer);
    assert.ok(ns.body.some((n) => n.claim === claim._id));
    assert.equal(
      (await call("patch", "/notifications/read-all", customer)).status,
      200,
    );
    const stats = await call("get", "/claims/stats", admin);
    assert.ok(stats.body.total >= 12);
    assert.ok(stats.body.approvedAmount > 0);
    assert.ok(stats.body.monthly.length);
    const filtered = await call(
      "get",
      "/claims?search=MH48ZZ1234&status=SETTLED",
      admin,
    );
    assert.equal(filtered.body.total, 1);
    assert.equal(filtered.body.items[0]._id, claim._id);
    const customers = await call("get", "/claims?search=Aarav", admin);
    assert.ok(customers.body.total > 0);
    const page = await call("get", "/claims?page=2", admin);
    assert.ok(page.body.items.length);
    assert.ok(page.body.items.length <= 10);
    assert.equal((await call("get", "/admin/audit-logs", admin)).status, 200);
  });
  await t.test("duplicate claims and referenced record archival", async () => {
    const duplicate = await call("post", "/claims", customer, body());
    assert.equal(duplicate.status, 201);
    assert.equal(
      (await call("patch", `/claims/${duplicate.body._id}/submit`, customer))
        .status,
      409,
    );
    assert.match(
      (await call("delete", `/policies/${policy._id}`, customer)).body.message,
      /archived/i,
    );
    assert.equal(
      (await call("get", `/policies/${policy._id}`, customer)).status,
      404,
    );
    assert.equal((await M.Policy.findById(policy._id)).archived, true);
    assert.match(
      (await call("delete", `/vehicles/${vehicle._id}`, customer)).body.message,
      /archived/i,
    );
    assert.equal((await M.Vehicle.findById(vehicle._id)).archived, true);
  });
});
