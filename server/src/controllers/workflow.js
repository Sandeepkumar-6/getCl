import { Claim, Policy, Vehicle, Estimate, Settlement, Payment, Grievance, RepairUpdate, Inspection, ClaimDocument, AuditLog } from "../models/index.js";
import { accessible, move, event } from "../services/claims.js";
import { requiresSurvey, requiredDocuments } from "../services/workflow.js";
import { calculateSettlement } from "../services/settlement.js";
import { rules } from "../config/rules.js";
import { assert } from "../utils/errors.js";

export const garages = [
  { id: "demo-mumbai", name: "Demo Mumbai Motor Works", city: "Mumbai", address: "Andheri West", network: true },
  { id: "demo-vasai", name: "Demo Vasai Auto Care", city: "Vasai", address: "Vasai West", network: true },
  { id: "demo-pune", name: "Demo Pune Repair Centre", city: "Pune", address: "Baner", network: true },
];
export function listGarages(req, res) {
  const search = String(req.query.search || "").toLowerCase().slice(0, 100);
  res.json(garages.filter(g => `${g.name} ${g.city} ${g.address}`.toLowerCase().includes(search)));
}
export async function calculateForClaim(claim, options = {}) {
  const [policy, vehicle, estimates, inspection] = await Promise.all([
    Policy.findById(claim.policy), Vehicle.findById(claim.vehicle),
    Estimate.find({ claim: claim._id, status: "APPROVED" }).sort({ createdAt: 1 }),
    Inspection.findOne({ claim: claim._id, submittedAt: { $ne: null } }),
  ]);
  assert(policy, 422, "The policy is unavailable.");
  if (claim.claimType === "THIRD_PARTY") {
    assert(Number.isSafeInteger(options.liabilityAward) && options.liabilityAward >= 0, 422, "Enter the separately reviewed legal liability award and explain the policy clause.");
    return { gross: options.liabilityAward, depreciation: 0, policyDeductible: 0, voluntaryDeductible: 0, ncbImpact: 0, salvage: 0, idvCap: 0, netPayable: options.liabilityAward, customerShare: 0, totalLoss: false, lines: [], notice: "Manually reviewed third-party liability award; not an own-damage or IDV calculation." };
  }
  let lineItems = estimates.flatMap(e => e.lineItems.map(l => ({ ...l.toObject(), category: l.category === "PAINT" ? "PAINTING" : l.category })));
  if (!lineItems.length && inspection) lineItems = [{ part: "Surveyed repair", category: "OTHER", cost: inspection.partsCost, labour: inspection.labourCost + inspection.taxAmount }];
  assert(lineItems.length || ["THEFT", "TOTAL_LOSS"].includes(claim.claimType), 422, "Approve a garage estimate or complete the inspection first.");
  try {
    return calculateSettlement({ lineItems, policy: policy.toObject(), claimType: claim.claimType, salvage: options.salvage || 0, vehicleAgeMonths: Math.max(0, ((claim.accident?.date || new Date()).getFullYear() - (vehicle?.manufacturingYear || new Date().getFullYear())) * 12) });
  } catch (error) { assert(false, 422, error.message); }
}
export async function preview(req, res) {
  const claim = await accessible(req.params.id, req.user);
  const saved = await Settlement.findOne({ claim: claim._id });
  if (saved) return res.json(saved);
  res.json(await calculateForClaim(claim));
}
export async function addEstimate(req, res) {
  const claim = await accessible(req.params.id, req.user);
  const initial = ["UNDER_REVIEW", "INSPECTION_COMPLETED", "ESTIMATE_SUBMITTED"];
  const supplementary = ["APPROVED", "ON_ACCOUNT_PAYMENT", "REPAIR_IN_PROGRESS", "READY_FOR_DELIVERY"];
  assert((req.body.supplementary ? supplementary : initial).includes(claim.status), 409, "An estimate cannot be added at this stage.");
  assert(claim.claimType === "OWN_DAMAGE", 422, "Repair estimates apply to own-damage claims.");
  assert(!(await Estimate.exists({ claim: claim._id, status: "PENDING" })), 409, "Review the pending estimate first.");
  assert(req.body.supplementary || !(await Estimate.exists({ claim: claim._id, status: "APPROVED", supplementary: false })), 409, "An initial estimate already exists; add a supplementary estimate during repair.");
  const total = req.body.lineItems.reduce((sum, item) => sum + item.cost + item.labour, 0);
  assert(Number.isSafeInteger(total) && total > 0, 422, "Enter a positive estimate within the supported amount range.");
  const approved = await Estimate.find({ claim: claim._id, status: "APPROVED" });
  claim.estimatedLoss = approved.reduce((sum, e) => sum + e.total, total);
  const estimate = await Estimate.create({ ...req.body, total, claim: claim._id, submittedBy: req.user._id });
  const status = req.body.supplementary ? "SUPPLEMENTARY_ESTIMATE" : "ESTIMATE_SUBMITTED";
  if (claim.status !== status) await move(claim, status, req.user, "Garage estimate submitted for approval.");
  else await claim.save();
  res.status(201).json(estimate);
}
export async function reviewEstimate(req, res) {
  const claim = await accessible(req.params.id, req.user);
  const estimate = await Estimate.findOne({ _id: req.params.estimateId, claim: claim._id });
  assert(estimate, 404, "Estimate not found.");
  if (req.user.role === "POLICYHOLDER") {
    assert(estimate.status === "APPROVED" && req.body.status === "APPROVED", 409, "Only an insurer-approved estimate can be accepted.");
    estimate.customerApprovedAt = new Date();
  } else {
    assert(estimate.status === "PENDING", 409, "This estimate has already been reviewed.");
    if (req.body.status === "APPROVED" && requiresSurvey(claim))
      assert(await Inspection.exists({ claim: claim._id, submittedAt: { $ne: null } }), 409, "A survey is mandatory at or above the survey threshold.");
    estimate.status = req.body.status;
    estimate.reviewedBy = req.user._id;
    claim.assignedAdmin = req.user._id;
    await claim.save();
  }
  estimate.note = req.body.note;
  await estimate.save();
  await event(claim, req.user, "ESTIMATE_REVIEWED", req.body.note);
  if (estimate.supplementary && estimate.status === "REJECTED" && claim.status === "SUPPLEMENTARY_ESTIMATE") await move(claim, "REPAIR_IN_PROGRESS", req.user, "Supplementary estimate rejected; previously approved repair remains available.");
  res.json(estimate);
}
export async function validateDecision(claim) {
  assert(["INSPECTION_COMPLETED", "ESTIMATE_SUBMITTED", "TOTAL_LOSS", "UNDER_REVIEW", "SUPPLEMENTARY_ESTIMATE"].includes(claim.status), 409, "Complete assessment before making a decision.");
  if (requiresSurvey(claim)) assert(await Inspection.exists({ claim: claim._id, submittedAt: { $ne: null } }), 409, "A completed survey report is required for this loss amount.");
  const docs = await ClaimDocument.find({ claim: claim._id, verificationStatus: { $ne: "REJECTED" } });
  assert(requiredDocuments(claim).every(type => docs.some(d => d.documentType === type)), 422, "Upload the documents required for this claim type before approval.");
  assert(!(await Estimate.exists({ claim: claim._id, status: "PENDING" })), 409, "Review the pending estimate first.");
}
export async function recordPayment(req, res) {
  const claim = await accessible(req.params.id, req.user);
  assert(["APPROVED", "ON_ACCOUNT_PAYMENT", "REPAIR_IN_PROGRESS", "READY_FOR_DELIVERY"].includes(claim.status), 409, "An approved claim is required to record a payment.");
  const settlement = await Settlement.findOne({ claim: claim._id });
  assert(settlement, 409, "Calculate and approve the settlement first.");
  assert(new Date(req.body.date) <= new Date(), 422, "Payment date cannot be in the future.");
  assert(!(await Payment.exists({ claim: claim._id, reference: req.body.reference })), 409, "This payment reference has already been recorded.");
  const payments = await Payment.find({ claim: claim._id });
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  if (req.body.kind === "INTERIM") assert(!payments.some(p => p.kind === "INTERIM"), 409, "An interim payment has already been recorded.");
  if (req.body.kind === "FINAL" && !settlement.totalLoss && claim.claimType === "OWN_DAMAGE") {
    assert(claim.status === "READY_FOR_DELIVERY", 409, "Mark repairs ready for delivery first.");
    if (claim.accident.claimType === "Reimbursement") {
      const documents = await ClaimDocument.find({ claim: claim._id, verificationStatus: { $ne: "REJECTED" } });
      assert(["Final invoice", "Payment receipt"].every(type => documents.some(d => d.documentType === type)), 422, "Upload the final invoice and payment receipt for reimbursement.");
    }
  }
  if (claim.accident.claimType === "Cashless") assert(req.body.mode === "CASHLESS", 422, "Record a cashless payment to the network garage.");
  const amount = req.body.kind === "FINAL" ? settlement.netPayable - paid : Math.min(settlement.netPayable - paid, Math.floor(settlement.netPayable * Math.min(100, rules.workflowDefaults.onAccountPaymentPercent) / 100));
  assert(amount >= 0 && (amount > 0 || req.body.kind === "FINAL"), 409, "There is no payable balance.");
  // Claim optimistic concurrency serializes competing payment requests before recording.
  claim.markModified("estimatedLoss");
  await claim.save();
  const payment = await Payment.create({ ...req.body, amount, claim: claim._id, recordedBy: req.user._id });
  await move(claim, req.body.kind === "FINAL" ? "SETTLED" : "ON_ACCOUNT_PAYMENT", req.user, `${req.body.kind} payment recorded: ${req.body.reference}. Demo ledger only; no funds transferred.`);
  res.status(201).json(payment);
}
export async function repair(req, res) {
  const claim = await accessible(req.params.id, req.user);
  assert(claim.claimType === "OWN_DAMAGE" && ["APPROVED", "ON_ACCOUNT_PAYMENT", "REPAIR_IN_PROGRESS", "READY_FOR_DELIVERY"].includes(claim.status), 409, "Repairs require an approved own-damage claim.");
  const settlement = await Settlement.findOne({ claim: claim._id });
  assert(!settlement?.totalLoss, 409, "A total-loss claim does not enter repair.");
  if (claim.accident.claimType === "Cashless") {
    assert(garages.some(g => g.id === claim.garageId), 422, "Select a demo network garage in the claim draft.");
    assert(!(await Estimate.exists({ claim: claim._id, status: "APPROVED", customerApprovedAt: null })), 409, "The policyholder must accept approved estimates before repair.");
  }
  const count = await ClaimDocument.countDocuments({ _id: { $in: req.body.documentIds }, claim: claim._id, mimeType: { $regex: "^image/" } });
  assert(count === req.body.documentIds.length, 422, "Choose photos belonging to this claim.");
  if (req.body.status && req.body.status !== claim.status) {
    assert(["ADMIN", "SURVEYOR"].includes(req.user.role), 403, "Only claim staff can change the repair stage.");
    await move(claim, req.body.status, req.user, req.body.note);
  }
  const update = await RepairUpdate.create({ ...req.body, claim: claim._id, author: req.user._id });
  await event(claim, req.user, "REPAIR_UPDATE", req.body.note);
  res.status(201).json(update);
}
async function draftText(claim) {
  const timeline = await AuditLog.find({ claim: claim._id }).sort({ timestamp: 1 }).limit(100);
  return `To the insurer grievance cell\nClaim: ${claim.claimNumber}\nCurrent stage: ${claim.status}\nDue: ${claim.dueAt?.toISOString() || "No current deadline"}\n\nTimeline\n${timeline.map(e => `${e.timestamp.toISOString().slice(0, 10)}: ${e.action} - ${e.note || ""}`).join("\n")}\n\nPlease review the delay or decision, provide a written explanation and confirm the next action.\nDraft only; review before sending.`;
}
export async function grievanceDraft(req, res) { res.json({ draft: await draftText(await accessible(req.params.id, req.user)) }); }
export async function addGrievance(req, res) {
  const claim = await accessible(req.params.id, req.user);
  assert(claim.status !== "DRAFT", 409, "Submit the claim before opening a grievance.");
  assert(!(await Grievance.exists({ claim: claim._id, resolvedAt: null })), 409, "An open grievance already exists.");
  const grievance = await Grievance.create({ ...req.body, claim: claim._id, submittedBy: req.user._id, draft: await draftText(claim), dueAt: new Date(Date.now() + rules.grievance.insurerResolutionDays * 86400000), history: [{ stage: "INSURER", at: new Date(), note: req.body.message }] });
  await event(claim, req.user, "GRIEVANCE_OPENED", req.body.message);
  res.status(201).json(grievance);
}
export async function updateGrievance(req, res) {
  const claim = await accessible(req.params.id, req.user);
  const grievance = await Grievance.findOne({ _id: req.params.grievanceId, claim: claim._id });
  assert(grievance && !grievance.resolvedAt, 409, "An open grievance is required.");
  if (req.body.resolution) {
    assert(req.user.role === "ADMIN", 403, "Only the claims team can record a resolution.");
    grievance.resolution = req.body.resolution;
    grievance.resolvedAt = new Date();
  } else {
    assert(req.user.role === "POLICYHOLDER", 403, "Only the policyholder can escalate a grievance.");
    const next = grievance.stage === "INSURER" ? "BIMA_BHAROSA" : grievance.stage === "BIMA_BHAROSA" ? "OMBUDSMAN" : null;
    assert(req.body.stage === next, 409, "Follow insurer, Bima Bharosa, then Ombudsman escalation.");
    const eligible = new Date(grievance.createdAt);
    if (next === "OMBUDSMAN") eligible.setMonth(eligible.getMonth() + rules.grievance.ombudsmanNoReplyEligibilityMonths);
    else eligible.setDate(eligible.getDate() + rules.grievance.bimaBharosaPublicEscalationDays);
    assert(new Date() >= eligible, 422, `No-response escalation is available from ${eligible.toISOString().slice(0, 10)}. External eligibility must be checked before filing.`);
    grievance.stage = next;
    grievance.history.push({ stage: next, at: new Date(), note: "Escalation draft recorded locally; not sent to an external service." });
  }
  await grievance.save();
  await event(claim, req.user, "GRIEVANCE_UPDATED", req.body.resolution || grievance.stage);
  res.json(grievance);
}
export async function calculator(req, res) {
  const policy = await Policy.findOne({ _id: req.body.policyId, policyholder: req.user._id, archived: { $ne: true } });
  assert(policy, 404, "Policy not found.");
  assert(policy.coverageType !== "Third-party", 422, "This policy does not provide own-damage cover.");
  const result = calculateSettlement({ policy: policy.toObject(), claimType: "OWN_DAMAGE", lineItems: [{ part: "Estimated repair", category: "OTHER", cost: req.body.estimatedCost, labour: 0 }], vehicleAgeMonths: 0 });
  res.json({ ...result, estimatedPayout: result.netPayable, ncbLost: result.ncbImpact, betterToClaim: result.netPayable > result.ncbImpact, notice: `${rules.settlement.uiNotice} This estimate excludes unknown depreciation, renewal pricing changes and policy exclusions.` });
}
