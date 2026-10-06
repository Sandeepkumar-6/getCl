import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import { connectDB, disconnectDB } from "./config/db.js";
import * as M from "./models/index.js";
import { transitions } from "./services/claims.js";
export async function seed() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo seed is disabled in production.");
  const allowed =
    mongoose.connection.name === "getclaim_db" ||
    /^getclaim_[a-z0-9_]*test$/i.test(mongoose.connection.name);
  if (!allowed)
    throw new Error("Seed is restricted to getclaim_db or an isolated getclaim_*test database.");
  for (const name of [
    "RevokedSession",
    "AuditLog",
    "Payment",
    "Settlement",
    "Estimate",
    "Grievance",
    "RepairUpdate",
    "Reminder",
    "VehicleCheck",
    "ServiceRecord",
    "VehicleDocument",
    "Notification",
    "Appeal",
    "Decision",
    "Inspection",
    "ClaimDocument",
    "Claim",
    "Policy",
    "Vehicle",
    "User",
  ])
    await M[name].deleteMany({});
  const accounts = [
    ["Aarav Mehta", "customer", "Customer", "POLICYHOLDER"],
    ["Neha Patil", "neha", "Customer", "POLICYHOLDER"],
    ["Rohan Shah", "rohan", "Customer", "POLICYHOLDER"],
    ["Priya Deshmukh", "surveyor", "Surveyor", "SURVEYOR"],
    ["Vikram Joshi", "vikram", "Surveyor", "SURVEYOR"],
    ["Ananya Rao", "admin", "Admin", "ADMIN"],
    ["Meera Iyer", "superadmin", "SuperAdmin", "SUPER_ADMIN"],
  ];
  const users = [];
  for (let i = 0; i < accounts.length; i++) {
    const [name, email, password, role] = accounts[i];
    users.push(
      await M.User.create({
        name,
        email: email + "@getclaim.in",
        password: await bcrypt.hash(password + "@123", 12),
        role,
        status: "ACTIVE",
        phone: "987654321" + i,
        address: "Manickpur Road, Vasai West",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "401202",
        surveyorRegion: role === "SURVEYOR" ? "Vasai–Virar and Mumbai" : "",
        ...(role === "SURVEYOR"
          ? {
              surveyorId: `GCS-${String(i).padStart(4, "0")}`,
              qualification: "Automobile Engineering",
              experience: 5,
            }
          : {}),
        ...(["ADMIN", "SUPER_ADMIN"].includes(role)
          ? { employeeId: `GCA-${String(i).padStart(4, "0")}` }
          : {}),
        mustChangePassword: false,
        emailVerifiedAt: new Date(),
      }),
    );
  }
  const vehicles = [],
    policies = [];
  const cars = [
    {
      registrationNumber: "MH48AB4821",
      manufacturer: "Tata",
      model: "Nexon",
      variant: "XZ Plus",
      manufacturingYear: 2023,
      vehicleType: "SUV",
      fuelType: "Petrol",
      chassisNumber: "MATNEXONXZP230001",
      engineNumber: "REVTRN230001",
    },
    {
      registrationNumber: "MH02CD7814",
      manufacturer: "Maruti Suzuki",
      model: "Baleno",
      variant: "Alpha",
      manufacturingYear: 2022,
      vehicleType: "Hatchback",
      fuelType: "Petrol",
      chassisNumber: "MA3BALENOAL220002",
      engineNumber: "K12NB220002",
    },
    {
      registrationNumber: "MH04EF2468",
      manufacturer: "Hyundai",
      model: "Creta",
      variant: "SX",
      manufacturingYear: 2024,
      vehicleType: "SUV",
      fuelType: "Diesel",
      chassisNumber: "MALCRETASXD240003",
      engineNumber: "CRDI240003",
    },
  ];
  for (let i = 0; i < cars.length; i++)
    vehicles.push(await M.Vehicle.create({
      ...cars[i],
      owner: users[0]._id,
      currentOdometer: [18420, 32650, 8900][i],
      lastOdometerUpdatedAt: new Date("2026-09-18"),
      serviceIntervalKm: 10000,
      serviceIntervalMonths: 12,
      nextServiceDueAt: new Date(["2026-10-15", "2027-02-12", "2027-01-08"][i]),
      verificationStatus: i === 0 ? "VERIFIED" : "USER_ADDED",
    }));
  vehicles.push(await M.Vehicle.create({
    registrationNumber: "GJ06KL5127", manufacturer: "Honda", model: "Amaze", variant: "VX",
    manufacturingYear: 2025, vehicleType: "Sedan", fuelType: "Petrol",
    chassisNumber: "MAKAMAZEVX250004", engineNumber: "L12B250004", owner: users[1]._id,
    currentOdometer: 4200, lastOdometerUpdatedAt: new Date("2026-09-12"),
    serviceIntervalKm: 10000, serviceIntervalMonths: 12, nextServiceDueAt: new Date("2027-03-10"),
    verificationStatus: "USER_ADDED",
  }));
  const policyData = [
    {
      policyNumber: "GCI-MH-2026-18452",
      insurer: "ICICI Lombard",
      coverageType: "Comprehensive",
      claimTypes: ["Cashless", "Reimbursement"],
      startDate: new Date("2026-01-01"),
      expiryDate: new Date("2027-12-31"),
      insuredDeclaredValue: 85000000,
      deductible: 200000,
      cashlessGarageAvailable: true,
      active: true,
    },
    {
      policyNumber: "HDFC-MH-2026-27814",
      insurer: "HDFC ERGO",
      coverageType: "Comprehensive",
      claimTypes: ["Cashless", "Reimbursement"],
      startDate: new Date("2026-01-01"),
      expiryDate: new Date("2027-12-31"),
      insuredDeclaredValue: 62500000,
      deductible: 150000,
      cashlessGarageAvailable: true,
      active: true,
    },
    {
      policyNumber: "BAJAJ-MH-2025-36218",
      insurer: "Bajaj Allianz",
      coverageType: "Third-party",
      claimTypes: ["Reimbursement"],
      startDate: new Date("2024-01-01"),
      expiryDate: new Date("2025-12-31"),
      insuredDeclaredValue: 105000000,
      deductible: 250000,
      cashlessGarageAvailable: false,
      active: false,
    },
  ];
  for (let i = 0; i < policyData.length; i++)
    policies.push(
      await M.Policy.create({
        ...policyData[i],
        policyholder: users[0]._id,
        vehicle: vehicles[i]._id,
        verificationStatus: i === 0 ? "VERIFIED" : "USER_ADDED",
      }),
    );
  policies.push(await M.Policy.create({
    policyNumber: "NIA-GJ-2026-45127", insurer: "New India Assurance",
    coverageType: "Comprehensive", claimTypes: ["Cashless", "Reimbursement"],
    startDate: new Date("2026-03-01"), expiryDate: new Date("2027-02-28"),
    insuredDeclaredValue: 78000000, deductible: 200000, cashlessGarageAvailable: true,
    active: true, policyholder: users[1]._id, vehicle: vehicles[3]._id, verificationStatus: "VERIFIED",
  }));
  await M.ServiceRecord.create({
    vehicle: vehicles[0]._id, owner: users[0]._id, serviceDate: new Date("2026-08-12"),
    odometer: 17650, serviceType: "General service", workshop: "Blue Ridge Auto Care, Pune",
    amount: 845000, notes: "Scheduled service recorded by the policyholder.", parts: ["Engine oil", "Oil filter"],
    nextServiceDue: new Date("2026-10-15"),
  });
  await M.ServiceRecord.create({
    vehicle: vehicles[3]._id, owner: users[1]._id, serviceDate: new Date("2026-07-06"),
    odometer: 3200, serviceType: "Scheduled service", workshop: "Riverfront Auto Care, Ahmedabad",
    amount: 615000, notes: "Routine service recorded by the policyholder.", parts: ["Engine oil"],
    nextServiceDue: new Date("2027-03-10"),
  });
  await M.VehicleCheck.create({
    vehicle: vehicles[0]._id, owner: users[0]._id, checkedAt: new Date("2026-09-18"),
    odometer: 18420, tyres: "OK", brakes: "OK", lights: "OK", fluids: "OK", exterior: "NEEDS_ATTENTION",
    notes: "Small scratch noted on the left door.",
  });
  await M.Reminder.insertMany([
    { vehicle: vehicles[0]._id, owner: users[0]._id, type: "SERVICE", title: "Scheduled service", dueDate: new Date("2026-10-15") },
    { vehicle: vehicles[0]._id, owner: users[0]._id, type: "PUC", title: "Renew PUC certificate", dueDate: new Date("2026-11-05") },
    { vehicle: vehicles[3]._id, owner: users[1]._id, type: "SERVICE", title: "Scheduled service", dueDate: new Date("2027-03-10"), dueOdometer: 10000 },
  ]);
  const targets = [
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "SURVEYOR_ASSIGNED",
    "INSPECTION_SCHEDULED",
    "INSPECTION_COMPLETED",
    "APPROVED",
    "REJECTED",
    "SETTLED",
    "MORE_INFORMATION_REQUIRED",
    "APPEALED",
  ];
  const routeTo = {
    DRAFT: ["DRAFT"],
    SUBMITTED: ["DRAFT", "SUBMITTED"],
    UNDER_REVIEW: ["DRAFT", "SUBMITTED", "UNDER_REVIEW"],
    MORE_INFORMATION_REQUIRED: [
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "MORE_INFORMATION_REQUIRED",
    ],
  };
  const base = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "SURVEYOR_ASSIGNED"];
  for (const target of [
    "SURVEYOR_ASSIGNED",
    "INSPECTION_SCHEDULED",
    "INSPECTION_COMPLETED",
    "APPROVED",
    "REJECTED",
    "SETTLED",
    "APPEALED",
  ]) {
    let steps = [...base];
    if (target !== "SURVEYOR_ASSIGNED") steps.push("INSPECTION_SCHEDULED");
    if (!["SURVEYOR_ASSIGNED", "INSPECTION_SCHEDULED"].includes(target))
      steps.push("INSPECTION_COMPLETED");
    if (["APPROVED", "SETTLED"].includes(target)) steps.push("APPROVED");
    if (["REJECTED", "APPEALED"].includes(target)) steps.push("REJECTED");
    if (["SETTLED", "APPEALED"].includes(target)) steps.push(target);
    routeTo[target] = steps;
  }
  const uploadDir = fileURLToPath(new URL("../uploads/", import.meta.url));
  await fs.mkdir(uploadDir, { recursive: true });
  // Deliberately labelled, generated sample documents; never represent real policy evidence.
  const samplePdf = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 400 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 82>>stream\nBT /F1 16 Tf 30 120 Td (SAMPLE DEMO EVIDENCE - NOT A REAL DOCUMENT) Tj ET\nendstream\nendobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  );
  await fs.writeFile(path.join(uploadDir, "sample-evidence.pdf"), samplePdf);
  await M.VehicleDocument.insertMany([
    { vehicle: vehicles[0]._id, owner: users[0]._id, documentType: "PUC", title: "PUC certificate", expiryDate: new Date("2026-11-05"), originalName: "SAMPLE-PUC.pdf", storedName: "sample-evidence.pdf", mimeType: "application/pdf", fileSize: samplePdf.length },
    { vehicle: vehicles[3]._id, owner: users[1]._id, documentType: "RC", title: "Registration certificate", originalName: "SAMPLE-RC.pdf", storedName: "sample-evidence.pdf", mimeType: "application/pdf", fileSize: samplePdf.length },
  ]);
  for (let i = 0; i < targets.length; i++) {
    const status = targets[i],
      vi = i % 3 === 0 ? 1 : 0,
      v = vehicles[vi],
      owner = users[0],
      p = policies[vi];
    const created = new Date(Date.now() - (i * 8 + 2) * 86400000);
    const accidentDate = new Date(
      Math.max(new Date("2026-01-02").getTime(), created.getTime() - 86400000),
    );
    const assigned = routeTo[status].includes("SURVEYOR_ASSIGNED");
    const c = await M.Claim.create({
      claimNumber: `GC-${new Date().getFullYear()}-${String(1041 + i).padStart(5, "0")}`,
      policyholder: owner._id,
      vehicle: v._id,
      policy: p._id,
      assignedSurveyor: assigned ? users[3]._id : undefined,
      status,
      accident: {
        date: accidentDate,
        time: "17:35",
        type: "Collision",
        claimType: i % 2 ? "Cashless" : "Reimbursement",
        location: ["Vasai West, Mumbai", "Virar East", "Andheri West"][i % 3],
        landmark: "Near the railway station junction",
        description:
          "While travelling slowly through the junction, another vehicle brushed the front bumper. The bumper and left headlamp sustained visible damage. The vehicle was moved safely to the roadside.",
        weather: i % 2 ? "Rain" : "Clear",
        road: i % 2 ? "Wet" : "Dry",
        driveable: true,
        injury: false,
        thirdParty: false,
      },
      declarationAccepted: status !== "DRAFT",
      readinessScore: 100,
      submittedAt: status !== "DRAFT" ? created : undefined,
      createdAt: created,
    });
    for (const type of [
      "Registration Certificate",
      "Driving licence",
      "Insurance policy",
      "Front damage photograph",
    ])
      await M.ClaimDocument.create({
        claim: c._id,
        uploadedBy: owner._id,
        documentType: type,
        originalName: "SAMPLE-EVIDENCE-" + type.replaceAll(" ", "-") + ".pdf",
        storedName: "sample-evidence.pdf",
        mimeType: "application/pdf",
        fileSize: samplePdf.length,
        verificationStatus: "ACCEPTED",
      });
    if (routeTo[status].includes("INSPECTION_SCHEDULED"))
      await M.Inspection.create({
        claim: c._id,
        surveyor: users[3]._id,
        scheduledDate:
          status === "INSPECTION_SCHEDULED"
            ? new Date(Date.now() + 86400000)
            : created,
        inspectionLocation: "Sample Auto Care, Vasai West",
        damageSummary:
          "Front bumper cracked and left headlamp mounting damaged. No visible chassis deformation.",
        affectedParts: ["Front bumper", "Left headlamp"],
        partsCost: 1800000,
        labourCost: 450000,
        taxAmount: 405000,
        estimatedRepairCost: 2655000,
        notes:
          "Demo inspection report. Repair estimate is illustrative and not an official insurer quotation.",
        submittedAt: routeTo[status].includes("INSPECTION_COMPLETED")
          ? created
          : undefined,
      });
    if (routeTo[status].some((s) => ["APPROVED", "REJECTED"].includes(s)))
      await M.Decision.create({
        claim: c._id,
        decidedBy: users[5]._id,
        outcome: ["REJECTED", "APPEALED"].includes(status)
          ? "REJECTED"
          : "APPROVED",
        reason: ["REJECTED", "APPEALED"].includes(status)
          ? "The submitted estimate includes prior damage outside this sample accident assessment. Please provide clarification."
          : "The damage observations and submitted evidence support this sample assessment.",
        policyClause: "Sample clause OD-4: accident-related own damage only",
        approvedAmount: ["REJECTED", "APPEALED"].includes(status) ? 0 : 2450000,
        deductible: 100000,
        payableAmount: ["REJECTED", "APPEALED"].includes(status) ? 0 : 2350000,
        decidedAt: created,
      });
    if (status === "APPEALED")
      await M.Appeal.create({
        claim: c._id,
        submittedBy: owner._id,
        reason:
          "Please reconsider the damage assessment. The additional workshop note links the bumper damage to this accident.",
        supportingInformation:
          "Sample workshop clarification provided for administrator review.",
      });
    const chain = routeTo[status];
    for (let j = 0; j < chain.length; j++) {
      const next = chain[j],
        actor = ["DRAFT", "SUBMITTED", "APPEALED"].includes(next)
          ? owner
          : ["INSPECTION_SCHEDULED", "INSPECTION_COMPLETED"].includes(next)
            ? users[3]
            : users[5];
      await M.AuditLog.create({
        claim: c._id,
        actor: actor._id,
        actorRole: actor.role,
        action: j ? "STATUS_CHANGED" : "DRAFT_CREATED",
        previousValue: j ? chain[j - 1] : "",
        newValue: next,
        note:
          next === "MORE_INFORMATION_REQUIRED"
            ? "Please upload a clearer number plate photograph and confirm the accident landmark."
            : `Sample workflow: ${next.replaceAll("_", " ").toLowerCase()}.`,
        timestamp: new Date(created.getTime() + j * 60000),
      });
    }
    await M.Notification.create({
      recipient: owner._id,
      claim: c._id,
      title: "Claim update",
      message: `${c.claimNumber} is ${status.replaceAll("_", " ").toLowerCase()}. Open the claim for your next step.`,
    });
    if (assigned)
      await M.Notification.create({
        recipient: users[3]._id,
        claim: c._id,
        title: "Assignment update",
        message: `${c.claimNumber}: ${v.registrationNumber}, ${c.accident.location}.`,
      });
    await M.Notification.create({
      recipient: users[5]._id,
      claim: c._id,
      title: "Claim activity",
      message: `${c.claimNumber} is ${status.replaceAll("_", " ").toLowerCase()}.`,
    });
  }
  console.log(
    "Seed complete: 7 users including one Super Admin, 4 customer vehicles, 4 linked policies and 11 claims with evidence, vehicle care, inspections, decisions, an appeal, notifications and audit history. Re-running resets the demo database without duplicates.",
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await connectDB();
    await seed();
  } catch (e) {
    console.error("Seed failed:", e.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}
