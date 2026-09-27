import crypto from "node:crypto";
import {
  Claim,
  Vehicle,
  Policy,
  Inspection,
  Decision,
  Appeal,
  AuditLog,
  ClaimDocument,
  User,
  Estimate,
  Settlement,
  Payment,
  Grievance,
  RepairUpdate,
} from "../models/index.js";
import {
  scope,
  accessible,
  move,
  event,
  readiness,
} from "../services/claims.js";
import { assert } from "../utils/errors.js";
import {
  persist,
  removeStoredFile,
  sendStoredFile,
} from "../middleware/uploads.js";
import { customerWorkflow, workflowInfo } from "../services/workflow.js";
import { calculateForClaim, validateDecision } from "./workflow.js";

const documentTypes = [
  "Front damage photograph",
  "Rear damage photograph",
  "Left-side photograph",
  "Right-side photograph",
  "Number plate photograph",
  "Accident-location photograph",
  "Registration Certificate",
  "Driving licence",
  "Insurance policy",
  "FIR or police report",
  "Keys and theft declaration",
  "Untraced police report",
  "RTO transfer or cancellation papers",
  "Legal or MACT notice",
  "Repair estimate",
  "Appeal evidence",
];

const claimNumber = () =>
  `GC-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
export async function list(req, res) {
  const query = { ...scope(req.user) };
  if (req.query.vehicleId) query.vehicle = String(req.query.vehicleId);
  if (req.query.policyId) query.policy = String(req.query.policyId);
  if (req.query.status) query.status = String(req.query.status);
  if (req.query.surveyor && ["ADMIN", "SUPER_ADMIN"].includes(req.user.role))
    query.assignedSurveyor = String(req.query.surveyor);
  if (req.query.assignment === "unassigned") query.assignedSurveyor = null;
  if (req.query.sla === "breached")
    query.$or = [{ breachedAt: { $ne: null } }, { dueAt: { $lt: new Date() } }];
  if (req.query.decision === "due") {
    query.decisionDueAt = { $gte: new Date(), $lte: new Date(Date.now() + 86400000) };
    query.status = { $nin: ["APPROVED", "REJECTED", "SETTLED"] };
  }
  if (req.query.documents === "pending") {
    const pending = await ClaimDocument.distinct("claim", { verificationStatus: "PENDING" });
    query._id = { $in: pending };
  }
  if (req.query.date)
    query["accident.date"] = {
      $gte: new Date(req.query.date),
      $lt: new Date(new Date(req.query.date).getTime() + 86400000),
    };
  if (req.query.search) {
    const escaped = String(req.query.search)
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const { User } = await import("../models/index.js");
    const users = await User.find({
      name: { $regex: escaped, $options: "i" },
    }).select("_id");
    const vehicles = await Vehicle.find({
      registrationNumber: { $regex: escaped, $options: "i" },
    }).select("_id");
    const searchOr = [
      { claimNumber: { $regex: escaped, $options: "i" } },
      { policyholder: { $in: users.map((u) => u._id) } },
      { vehicle: { $in: vehicles.map((v) => v._id) } },
    ];
    query.$and = [...(query.$and || []), { $or: searchOr }];
  }
  const page = Math.max(1, Number(req.query.page) || 1),
    limit = 10;
  const [items, total] = await Promise.all([
    Claim.find(query)
      .populate("policyholder", "name email")
      .populate("vehicle")
      .populate("assignedSurveyor", "name")
      .sort({ createdAt: req.query.sort === "oldest" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Claim.countDocuments(query),
  ]);
  res.json({
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}
export async function create(req, res) {
  await validateOwnership(req.body, req.user);
  let claim;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      claim = await Claim.create({
        ...req.body,
        policyholder: req.user._id,
        claimNumber: claimNumber(),
      });
      break;
    } catch (error) {
      const collision = error.code === 11000 && error.keyPattern?.claimNumber;
      if (!collision || attempt === 4) throw error;
    }
  }
  await event(claim, req.user, "DRAFT_CREATED", "Claim draft saved.");
  res.status(201).json(claim);
}
async function validateOwnership(body, user) {
  const v = await Vehicle.findOne({
    _id: body.vehicle,
    owner: user._id,
    archived: { $ne: true },
  });
  assert(v, 403, "The selected vehicle does not belong to your account.");
  const p = await Policy.findOne({
    _id: body.policy,
    vehicle: body.vehicle,
    policyholder: user._id,
    archived: { $ne: true },
  });
  assert(
    p,
    403,
    "The selected policy does not belong to this vehicle and policyholder.",
  );
  return { v, p };
}
export async function detail(req, res) {
  const claim = await accessible(req.params.id, req.user);
  await claim.populate([
    "vehicle",
    {
      path: "policy",
      select:
        "policyNumber insurer coverageType claimTypes startDate expiryDate insuredDeclaredValue deductible cashlessGarageAvailable active archived vehicle policyholder",
    },
    { path: "policyholder", select: "name email phone" },
    { path: "assignedSurveyor", select: "name email phone" },
  ]);
  const [documents, inspection, decisions, appeals, timeline, ready,
    estimates, settlement, payments, grievances, repairUpdates] =
    await Promise.all([
      ClaimDocument.find({ claim: claim._id }).select("-storedName -storageKey"),
      Inspection.findOne({ claim: claim._id }),
      Decision.find({ claim: claim._id }).sort({ createdAt: -1 }),
      Appeal.find({ claim: claim._id }).sort({ createdAt: -1 }),
      AuditLog.find({ claim: claim._id })
        .populate("actor", "name")
        .sort({ timestamp: 1 }),
      readiness(claim),
      Estimate.find({ claim: claim._id }).sort({ createdAt: 1 }),
      Settlement.findOne({ claim: claim._id }),
      Payment.find({ claim: claim._id }).sort({ createdAt: 1 }),
      Grievance.find({ claim: claim._id }).sort({ createdAt: 1 }),
      RepairUpdate.find({ claim: claim._id }).sort({ createdAt: 1 }),
    ]);
  res.json({
    claim,
    documents,
    inspection,
    decisions,
    appeals,
    timeline,
    readiness: ready,
    workflow: workflowInfo(claim),
    customerWorkflow: customerWorkflow(claim),
    estimates,
    settlement,
    payments,
    grievances,
    repairUpdates,
  });
}
export async function saveDraft(req, res) {
  const claim = await accessible(req.params.id, req.user);
  assert(claim.status === "DRAFT", 409, "Only drafts can be edited.");
  await validateOwnership(req.body, req.user);
  Object.assign(claim, req.body);
  claim.readinessScore = (await readiness(claim)).score;
  await claim.save();
  res.json(claim);
}
export async function submit(req, res) {
  const claim = await accessible(req.params.id, req.user);
  assert(claim.status === "DRAFT", 409, "Only a draft may be submitted.");
  const { p } = await validateOwnership(
    { vehicle: claim.vehicle, policy: claim.policy },
    req.user,
  );
  const accidentDate = claim.accident?.date;
  assert(accidentDate, 422, "Enter the accident date before submission.");
  assert(
    accidentDate <= new Date(),
    422,
    "Accident date cannot be in the future.",
  );
  assert(
    p.active && accidentDate >= p.startDate && accidentDate <= p.expiryDate,
    422,
    "The selected policy did not cover the vehicle on the accident date.",
  );
  assert(
    claim.accident?.time &&
      claim.accident?.type &&
      claim.accident?.location &&
      (claim.accident?.description?.trim().length || 0) >= 50,
    422,
    "Complete the required accident date, time, type, location and description.",
  );
  const duplicate = await Claim.exists({
    _id: { $ne: claim._id },
    policyholder: req.user._id,
    vehicle: claim.vehicle,
    "accident.date": accidentDate,
    status: { $ne: "DRAFT" },
  });
  assert(
    !duplicate,
    409,
    "A claim already exists for this vehicle and accident date.",
  );
  const ready = await readiness(claim);
  assert(
    ready.score === 100,
    422,
    `Complete these requirements: ${ready.missing.join("; ")}`,
  );
  assert(
    claim.declarationAccepted,
    422,
    "Accept the truthfulness declaration before submission.",
  );
  claim.readinessScore = ready.score;
  claim.submittedAt = new Date();
  res.json(
    await move(
      claim,
      "SUBMITTED",
      req.user,
      "Policyholder submitted the claim and declaration.",
    ),
  );
}
export async function stats(req, res) {
  const claims = await Claim.find(scope(req.user));
  const ids = claims.map((c) => c._id);
  const counts = Object.fromEntries(
    (await import("../models/index.js")).statuses.map((s) => [
      s,
      claims.filter((c) => c.status === s).length,
    ]),
  );
  const decisions = await Decision.find({
    claim: { $in: ids },
    outcome: "APPROVED",
  });
  const months = {};
  for (const c of claims) {
    const key = c.createdAt.toISOString().slice(0, 7);
    months[key] = (months[key] || 0) + 1;
  }
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const attention = {
    slaBreaches: claims.filter((claim) => claim.breachedAt || (claim.dueAt && claim.dueAt < now)).length,
    slaApproaching: claims.filter((claim) => !claim.breachedAt && claim.dueAt && claim.dueAt >= now && claim.dueAt <= in24Hours).length,
    awaitingSurveyor: claims.filter((claim) => claim.status === "UNDER_REVIEW" && !claim.assignedSurveyor).length,
    documentsAwaitingVerification: await ClaimDocument.countDocuments({ claim: { $in: ids }, verificationStatus: "PENDING" }),
    decisionsDueToday: claims.filter((claim) => claim.decisionDueAt && claim.decisionDueAt >= now && claim.decisionDueAt <= in24Hours && !["APPROVED", "REJECTED", "SETTLED"].includes(claim.status)).length,
  };
  const governance = req.user.role === "SUPER_ADMIN" ? {
    users: await User.countDocuments({ role: "POLICYHOLDER" }),
    surveyors: await User.countDocuments({ role: "SURVEYOR" }),
    administrators: await User.countDocuments({ role: { $in: ["ADMIN", "SUPER_ADMIN"] } }),
    vehicles: await Vehicle.countDocuments({ archived: { $ne: true } }),
    auditEvents: await AuditLog.countDocuments(),
  } : undefined;
  res.json({
    total: claims.length,
    counts,
    approvedAmount: decisions.reduce((s, d) => s + d.payableAmount, 0),
    statusChart: Object.entries(counts)
      .filter(([, value]) => value)
      .map(([name, value]) => ({ name: name.replaceAll("_", " "), value })),
    monthly: Object.entries(months)
      .sort()
      .map(([name, value]) => ({ name, value })),
    attention,
    governance,
    activity: await AuditLog.find({ claim: { $in: ids } })
      .sort({ timestamp: -1 })
      .limit(6)
      .populate("actor", "name"),
  });
}

export async function transition(req, res) {
  const claim = await accessible(req.params.id, req.user);
  res.json(await move(claim, req.body.status, req.user, req.body.note));
}

export async function respond(req, res) {
  const claim = await accessible(req.params.id, req.user);
  assert(
    claim.status === "MORE_INFORMATION_REQUIRED",
    409,
    "No information request is currently open.",
  );
  claim.customerResponse = req.body.response;
  const inspection = await Inspection.findOne({
    claim: claim._id,
    submittedAt: { $ne: null },
  });
  res.json(
    await move(
      claim,
      inspection ? "INSPECTION_COMPLETED" : "UNDER_REVIEW",
      req.user,
      req.body.response,
    ),
  );
}

export async function assign(req, res) {
  const claim = await accessible(req.params.id, req.user);
  assert(
    claim.status === "UNDER_REVIEW",
    409,
    "Move the claim under review before assigning a surveyor.",
  );
  const surveyor = await User.findOne({
    _id: req.body.surveyor,
    role: "SURVEYOR",
    status: "ACTIVE",
  });
  assert(surveyor, 422, "Choose an active surveyor.");
  claim.assignedSurveyor = surveyor._id;
  res.json(
    await move(
      claim,
      "SURVEYOR_ASSIGNED",
      req.user,
      `Assigned to ${surveyor.name}.`,
    ),
  );
}

export async function listDocuments(req, res) {
  await accessible(req.params.id, req.user);
  res.json(
    await ClaimDocument.find({ claim: req.params.id }).select("-storedName -storageKey"),
  );
}

export async function prepareDocumentUpload(req, res, next) {
  const claim = await accessible(req.params.id, req.user);
  assert(
    ["DRAFT", "MORE_INFORMATION_REQUIRED", "REJECTED", "APPEALED"].includes(
      claim.status,
    ),
    409,
    "Evidence can be added to drafts, information requests and appeals.",
  );
  req.claim = claim;
  next();
}

export async function uploadDocument(req, res) {
  assert(
    documentTypes.includes(req.body.documentType),
    422,
    "Select a valid document type.",
  );
  const data = await persist(req.file);
  try {
    const document = await ClaimDocument.create({
      ...data,
      claim: req.params.id,
      uploadedBy: req.user._id,
      documentType: req.body.documentType,
    });
    await event(req.claim, req.user, "DOCUMENT_UPLOADED", req.body.documentType);
    res.status(201).json({
      _id: document._id,
      originalName: document.originalName,
      documentType: document.documentType,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
    });
  } catch (error) {
    await removeStoredFile(data);
    throw error;
  }
}

export async function downloadDocument(req, res) {
  await accessible(req.params.id, req.user);
  const document = await ClaimDocument.findOne({
    _id: req.params.documentId,
    claim: req.params.id,
  });
  assert(document, 404, "Document not found.");
  await sendStoredFile(res, document);
}

export async function deleteDocument(req, res) {
  const claim = await accessible(req.params.id, req.user);
  assert(
    ["DRAFT", "MORE_INFORMATION_REQUIRED"].includes(claim.status),
    409,
    "Submitted evidence is retained for the audit trail.",
  );
  const document = await ClaimDocument.findOne({
    _id: req.params.documentId,
    claim: claim._id,
  });
  assert(document, 404, "Document not found.");
  await document.deleteOne();
  await removeStoredFile(document);
  await event(claim, req.user, "DOCUMENT_REMOVED", document.originalName);
  res.json({ message: "Document removed." });
}

export async function verifyDocument(req, res) {
  const claim = await accessible(req.params.id, req.user);
  assert(
    req.body.verificationStatus !== "REJECTED" ||
      req.body.rejectionReason?.length >= 5,
    422,
    "Explain why the evidence was rejected.",
  );
  const document = await ClaimDocument.findOneAndUpdate(
    { _id: req.params.documentId, claim: claim._id },
    req.body,
    { new: true, runValidators: true },
  ).select("-storedName -storageKey");
  assert(document, 404, "Document not found.");
  await event(
    claim,
    req.user,
    "DOCUMENT_REVIEWED",
    `${document.originalName}: ${document.verificationStatus}. ${document.rejectionReason || ""}`,
  );
  res.json(document);
}

export async function scheduleInspection(req, res) {
  const claim = await accessible(req.params.id, req.user);
  assert(
    claim.status === "SURVEYOR_ASSIGNED",
    409,
    "An assigned claim is required to schedule an inspection.",
  );
  const inspection = await Inspection.findOneAndUpdate(
    { claim: claim._id },
    { ...req.body, surveyor: req.user._id },
    { upsert: true, new: true, runValidators: true },
  );
  await move(
    claim,
    "INSPECTION_SCHEDULED",
    req.user,
    `Inspection booked at ${inspection.inspectionLocation} on ${inspection.scheduledDate.toISOString()}.`,
  );
  res.status(201).json(inspection);
}

export async function submitInspection(req, res) {
  const claim = await accessible(req.params.id, req.user);
  assert(
    claim.status === "INSPECTION_SCHEDULED" && claim.assignedSurveyor,
    409,
    "Schedule an assigned inspection before submitting a report.",
  );
  const inspection = await Inspection.findOne({ claim: claim._id });
  assert(inspection, 409, "Inspection has not been scheduled.");
  Object.assign(inspection, req.body, {
    estimatedRepairCost: req.body.partsCost + req.body.labourCost + req.body.taxAmount,
    submittedAt: new Date(),
  });
  await inspection.save();
  await move(
    claim,
    "INSPECTION_COMPLETED",
    req.user,
    "Inspection report and repair estimate submitted.",
  );
  res.status(201).json(inspection);
}

export async function getInspection(req, res) {
  await accessible(req.params.id, req.user);
  res.json(await Inspection.findOne({ claim: req.params.id }));
}

export async function decide(req, res) {
  const claim = await accessible(req.params.id, req.user);
  await validateDecision(claim);
  const previous = claim.status;
  let assessment;
  if (req.body.outcome === "APPROVED") {
    assessment = await calculateForClaim(claim, req.body);
    if (req.body.overrideAmount !== undefined) {
      assert(req.body.overrideReason, 422, "Explain why the calculated payout is overridden.");
      assessment.netPayable = req.body.overrideAmount;
      assessment.customerShare = Math.max(0, assessment.gross - assessment.netPayable);
      assessment.overrideReason = req.body.overrideReason;
    }
  }
  claim.assignedAdmin = req.user._id;
  try {
    const decision = await Decision.create({
      ...req.body,
      claim: claim._id,
      decidedBy: req.user._id,
      approvedAmount: assessment?.gross || 0,
      deductible: assessment
        ? assessment.policyDeductible + assessment.voluntaryDeductible
        : 0,
      payableAmount: assessment?.netPayable || 0,
    });
    if (assessment) {
      await Settlement.findOneAndUpdate(
        { claim: claim._id },
        { ...assessment, claim: claim._id, calculatedBy: req.user._id },
        { upsert: true, new: true, runValidators: true },
      );
    }
    await move(claim, req.body.outcome, req.user, req.body.reason);
    return res.status(201).json(decision);
  } catch (error) {
    claim.status = previous;
    await claim.save();
    throw error;
  }
}

export async function appeal(req, res) {
  const claim = await accessible(req.params.id, req.user);
  assert(claim.status === "REJECTED", 409, "Only rejected claims can be appealed.");
  const appealRecord = await Appeal.create({
    ...req.body,
    claim: claim._id,
    submittedBy: req.user._id,
  });
  await move(claim, "APPEALED", req.user, req.body.reason);
  res.status(201).json(appealRecord);
}

export async function reviewAppeal(req, res) {
  const claim = await accessible(req.params.id, req.user);
  assert(claim.status === "APPEALED", 409, "There is no open appeal.");
  const appealRecord = await Appeal.findOne({ claim: claim._id, status: "PENDING" });
  assert(appealRecord, 404, "Pending appeal not found.");
  Object.assign(appealRecord, req.body, {
    reviewedBy: req.user._id,
    reviewedAt: new Date(),
  });
  await appealRecord.save();
  await move(
    claim,
    req.body.status === "REOPENED" ? "UNDER_REVIEW" : "REJECTED",
    req.user,
    req.body.reviewNote,
  );
  res.json(appealRecord);
}
