import { rules } from "../config/rules.js";

export const requiresSurvey = (claim) => claim.estimatedLoss >= rules.survey.mandatoryMotorLossThresholdPaise;
export const transitions = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "MORE_INFORMATION_REQUIRED"],
  UNDER_REVIEW: ["SURVEYOR_ASSIGNED", "ESTIMATE_SUBMITTED", "TOTAL_LOSS", "MORE_INFORMATION_REQUIRED", "REJECTED"],
  MORE_INFORMATION_REQUIRED: ["UNDER_REVIEW", "INSPECTION_COMPLETED"],
  SURVEYOR_ASSIGNED: ["INSPECTION_SCHEDULED"],
  INSPECTION_SCHEDULED: ["INSPECTION_COMPLETED"],
  INSPECTION_COMPLETED: ["ESTIMATE_SUBMITTED", "TOTAL_LOSS", "APPROVED", "REJECTED", "MORE_INFORMATION_REQUIRED"],
  ESTIMATE_SUBMITTED: ["APPROVED", "REJECTED", "MORE_INFORMATION_REQUIRED", "SURVEYOR_ASSIGNED", "TOTAL_LOSS"],
  TOTAL_LOSS: ["APPROVED", "REJECTED", "MORE_INFORMATION_REQUIRED"],
  APPROVED: ["ON_ACCOUNT_PAYMENT", "REPAIR_IN_PROGRESS", "READY_FOR_DELIVERY", "SETTLED", "SUPPLEMENTARY_ESTIMATE"],
  ON_ACCOUNT_PAYMENT: ["REPAIR_IN_PROGRESS", "READY_FOR_DELIVERY", "SUPPLEMENTARY_ESTIMATE", "SETTLED"],
  REPAIR_IN_PROGRESS: ["SUPPLEMENTARY_ESTIMATE", "READY_FOR_DELIVERY", "ON_ACCOUNT_PAYMENT"],
  SUPPLEMENTARY_ESTIMATE: ["APPROVED", "REPAIR_IN_PROGRESS", "SURVEYOR_ASSIGNED"],
  READY_FOR_DELIVERY: ["SETTLED", "SUPPLEMENTARY_ESTIMATE"],
  REJECTED: ["APPEALED"], APPEALED: ["UNDER_REVIEW", "REJECTED"], SETTLED: [],
};
export function applyClock(claim, status, now = new Date()) {
  claim.breachedAt = undefined;
  if (status === "SURVEYOR_ASSIGNED") {
    claim.surveyAllocatedAt = now;
    claim.decisionDueAt = new Date(+now + (rules.claimSla.surveyReportDays + rules.claimSla.insurerDecisionDays) * 86400000);
  }
  if (status === "INSPECTION_COMPLETED") {
    const reportDue = new Date(+now + rules.claimSla.insurerDecisionDays * 86400000);
    claim.decisionDueAt = claim.decisionDueAt && claim.decisionDueAt < reportDue ? claim.decisionDueAt : reportDue;
  }
  if (["DRAFT", "SETTLED", "REJECTED"].includes(status)) claim.dueAt = undefined;
  else if (["SUBMITTED", "UNDER_REVIEW"].includes(status) && requiresSurvey(claim) && !claim.surveyAllocatedAt)
    claim.dueAt = new Date(+(claim.submittedAt || now) + rules.claimSla.surveyorAllocationHours * 3600000);
  else if (["SURVEYOR_ASSIGNED", "INSPECTION_SCHEDULED"].includes(status))
    claim.dueAt = new Date(+(claim.surveyAllocatedAt || now) + rules.claimSla.surveyReportDays * 86400000);
  else if (["INSPECTION_COMPLETED", "ESTIMATE_SUBMITTED", "TOTAL_LOSS"].includes(status) && claim.decisionDueAt)
    claim.dueAt = claim.decisionDueAt;
  else claim.dueAt = new Date(+now + rules.workflowDefaults.operationalTargetDays * 86400000);
}
export function requiredDocuments(claim) {
  const docs = ["Registration Certificate", "Insurance policy"];
  if (claim.claimType !== "THEFT") docs.push("Driving licence");
  if (["THEFT", "THIRD_PARTY"].includes(claim.claimType) || claim.accident?.injury || claim.accident?.thirdParty)
    docs.push("FIR or police report");
  if (claim.claimType === "THEFT") docs.push("Keys and theft declaration", "Untraced police report", "RTO transfer or cancellation papers");
  else if (claim.claimType === "THIRD_PARTY") docs.push("Legal or MACT notice");
  else docs.push("Front damage photograph");
  return docs;
}
export const workflowInfo = (claim) => ({
  requiresSurvey: requiresSurvey(claim), allowedTransitions: transitions[claim.status] || [],
  requiredDocuments: requiredDocuments(claim), dueAt: claim.dueAt, breachedAt: claim.breachedAt,
  owner: ["SURVEYOR_ASSIGNED", "INSPECTION_SCHEDULED"].includes(claim.status) ? "Surveyor" : claim.status === "MORE_INFORMATION_REQUIRED" ? "Policyholder" : "Claims team",
  notice: "Repair and desk-review dates are sample operational targets, not statutory guarantees.",
});

const customerStages = {
  DRAFT: "Draft", SUBMITTED: "Submitted", UNDER_REVIEW: "Verification",
  MORE_INFORMATION_REQUIRED: "Verification", SURVEYOR_ASSIGNED: "Survey",
  INSPECTION_SCHEDULED: "Survey", INSPECTION_COMPLETED: "Assessment",
  ESTIMATE_SUBMITTED: "Assessment", SUPPLEMENTARY_ESTIMATE: "Assessment",
  TOTAL_LOSS: "Assessment", APPROVED: "Decision", REJECTED: "Decision",
  APPEALED: "Decision", ON_ACCOUNT_PAYMENT: "Settlement",
  REPAIR_IN_PROGRESS: "Settlement", READY_FOR_DELIVERY: "Settlement", SETTLED: "Settlement",
};

const nextByStatus = {
  DRAFT: "Complete and submit your claim", SUBMITTED: "Claims team verification",
  UNDER_REVIEW: "Evidence and coverage review", MORE_INFORMATION_REQUIRED: "Provide the requested information",
  SURVEYOR_ASSIGNED: "Surveyor schedules the inspection", INSPECTION_SCHEDULED: "Vehicle inspection",
  INSPECTION_COMPLETED: "Damage assessment", ESTIMATE_SUBMITTED: "Claims decision",
  SUPPLEMENTARY_ESTIMATE: "Review supplementary estimate", TOTAL_LOSS: "Claims decision",
  APPROVED: "Settlement processing", REJECTED: "Review decision or appeal",
  APPEALED: "Appeal review", ON_ACCOUNT_PAYMENT: "Repair progress",
  REPAIR_IN_PROGRESS: "Repair completion", READY_FOR_DELIVERY: "Final settlement", SETTLED: "No action required",
};

export const customerWorkflow = (claim) => ({
  stage: customerStages[claim.status] || "Assessment",
  internalStatus: claim.status,
  happening: claim.status === "INSPECTION_SCHEDULED" ? "Survey scheduled" : claim.status.replaceAll("_", " ").toLowerCase(),
  handler: claim.assignedSurveyor?.name ? `Surveyor: ${claim.assignedSurveyor.name}` : "Claims team",
  next: nextByStatus[claim.status] || "Claims team review",
  dueAt: claim.dueAt,
  actionOwner: claim.status === "MORE_INFORMATION_REQUIRED" ? "You" : ["SURVEYOR_ASSIGNED", "INSPECTION_SCHEDULED"].includes(claim.status) ? "Surveyor" : claim.status === "SETTLED" ? "System" : "Claims team",
  ageHours: Math.max(0, Math.floor((Date.now() - new Date(claim.submittedAt || claim.createdAt)) / 3600000)),
});
