// The status map from the design system's "The claim journey" guide.
// Family decides colour and depends on who has to act, so labels differ for policyholders and staff.
import { label as humanise, dateShort, humaniseText, DOC_LABELS } from "./format";

export const STAGES = ["Reported", "Review", "Survey", "Decision", "Settlement"];
export const SURVEY_THRESHOLD_PAISE = 5_000_000; // IRDAI: losses of ₹50,000 or more need a survey.

// status: [stage index, customer [label, family], staff [label, family], who acts next]
const CLAIM = {
  DRAFT: [0, ["Draft · finish it", "action"], ["Draft", "neutral"], "Policyholder"],
  SUBMITTED: [1, ["Submitted", "progress"], ["New", "action"], "Claims team"],
  UNDER_REVIEW: [1, ["Under review", "progress"], ["In review", "action"], "Claims team"],
  MORE_INFORMATION_REQUIRED: [1, ["Information requested", "action"], ["Waiting on customer", "progress"], "Policyholder"],
  SURVEYOR_ASSIGNED: [2, ["Surveyor assigned", "progress"], ["Book inspection", "action"], "Surveyor"],
  INSPECTION_SCHEDULED: [2, ["Inspection booked", "progress"], ["Inspect and report", "action"], "Surveyor"],
  INSPECTION_COMPLETED: [3, ["Survey done", "progress"], ["Report in", "action"], "Claims team"],
  ESTIMATE_SUBMITTED: [3, ["Estimate under review", "progress"], ["Estimate to assess", "action"], "Claims team"],
  SUPPLEMENTARY_ESTIMATE: [3, ["Extra estimate under review", "progress"], ["Extra estimate to assess", "action"], "Claims team"],
  TOTAL_LOSS: [3, ["Total-loss assessment", "progress"], ["Total loss to decide", "action"], "Claims team"],
  APPROVED: [4, ["Approved", "positive"], ["Approved · settle", "action"], "Claims team"],
  ON_ACCOUNT_PAYMENT: [4, ["Part payment made", "positive"], ["Part paid", "progress"], "Claims team"],
  REPAIR_IN_PROGRESS: [4, ["Repair in progress", "progress"], ["Repair in progress", "progress"], "Garage"],
  READY_FOR_DELIVERY: [4, ["Ready to collect", "action"], ["Ready for delivery", "progress"], "Policyholder"],
  REJECTED: [3, ["Rejected", "critical"], ["Rejected", "critical"], "Policyholder"],
  APPEALED: [3, ["Appeal under review", "progress"], ["Appeal to review", "action"], "Claims team"],
  SETTLED: [5, ["Settled", "positive"], ["Settled", "positive"], "Nobody"],
};

// Which staff role owns the action for "action" family staff labels.
const STAFF_OWNER = {
  SURVEYOR_ASSIGNED: "SURVEYOR",
  INSPECTION_SCHEDULED: "SURVEYOR",
};

// Every other status the app shows, by value. [label, family]
const OTHER = {
  ACTIVE: ["Active", "positive"],
  UPCOMING: ["Upcoming", "progress"],
  EXPIRED: ["Expired", "critical"],
  INACTIVE: ["Inactive", "neutral"],
  NO_POLICY: ["No policy", "neutral"],
  PENDING: ["Being checked", "progress"],
  ACCEPTED: ["Checked", "positive"],
  VERIFIED: ["Verified", "positive"],
  USER_ADDED: ["Added by you", "neutral"],
  NOT_CHECKED: ["Not checked", "neutral"],
  OK: ["OK", "positive"],
  NEEDS_ATTENTION: ["Needs attention", "action"],
  COMPLETED: ["Completed", "positive"],
  DISMISSED: ["Dismissed", "neutral"],
  DUE: ["Due", "action"],
  SUSPENDED: ["Suspended", "critical"],
  CANCELLED: ["Cancelled", "neutral"],
  REOPENED: ["Reopened", "progress"],
  UPHELD: ["Rejection upheld", "critical"],
  PAID: ["Paid", "positive"],
  RECORDED: ["Recorded", "positive"],
  EXPIRING: ["Renew soon", "action"],
  VALID: ["Valid", "positive"],
  EXPIRING_SOON: ["Renew soon", "action"],
};
const DECISION = { APPROVED: ["Approved", "positive"], REJECTED: ["Rejected", "critical"] };
const DOCUMENT = { PENDING: ["Being checked", "progress"], ACCEPTED: ["Checked", "positive"], VERIFIED: ["Checked", "positive"], REJECTED: ["Replace", "critical"] };
const STAFF_ACCOUNT = { PENDING: ["Waiting for approval", "action"], ACTIVE: ["Active", "positive"], REJECTED: ["Rejected", "critical"], SUSPENDED: ["Suspended", "critical"] };
const ESTIMATE = { PENDING: ["To assess", "action"], APPROVED: ["Approved", "positive"], REJECTED: ["Rejected", "critical"] };
const APPEAL = { PENDING: ["Under review", "progress"], SUBMITTED: ["Under review", "progress"], REOPENED: ["Reopened", "positive"], UPHELD: ["Rejection upheld", "critical"] };

const isStaff = (role) => role && role !== "POLICYHOLDER";

export function claimStatus(status, role = "POLICYHOLDER") {
  const row = CLAIM[status];
  if (!row) return { label: humanise(status), family: "neutral" };
  if (!isStaff(role)) return { label: row[1][0], family: row[1][1] };
  let [text, family] = row[2];
  // An admin sees surveyor work as in progress; a surveyor sees admin work as in progress.
  const owner = STAFF_OWNER[status] || "ADMIN";
  if (family === "action" && ((owner === "SURVEYOR") !== (role === "SURVEYOR"))) family = "progress";
  return { label: text, family };
}

// kind: "claim" | "document" | "staff" | "estimate" | "appeal" | anything else
export function statusInfo(status, { kind = "claim", role = "POLICYHOLDER" } = {}) {
  if (kind === "claim" && CLAIM[status]) return claimStatus(status, role);
  const table = { document: DOCUMENT, staff: STAFF_ACCOUNT, estimate: ESTIMATE, appeal: APPEAL, decision: DECISION }[kind];
  const row = (table && table[status]) || OTHER[status] || (CLAIM[status] && claimStatus(status, role));
  if (Array.isArray(row)) return { label: row[0], family: row[1] };
  if (row) return row;
  return { label: humanise(status), family: status === "REJECTED" ? "critical" : "neutral" };
}

export const needsPolicyholder = (status) => ["DRAFT", "MORE_INFORMATION_REQUIRED", "READY_FOR_DELIVERY", "REJECTED"].includes(status);
export const isOpenClaim = (status) => !["DRAFT", "REJECTED", "SETTLED"].includes(status);

export const requiresSurvey = (claim, workflow) =>
  Boolean(workflow?.requiresSurvey ?? (claim?.assignedSurveyor || (claim?.estimatedLoss || 0) >= SURVEY_THRESHOLD_PAISE));

// Five steps with a state each: complete | current | upcoming | skipped, plus is-action / is-critical on the current one.
export function journey(claim, { role = "POLICYHOLDER", survey } = {}) {
  const status = claim?.status;
  const row = CLAIM[status];
  const current = row ? row[0] : 0;
  const needsSurvey = survey ?? requiresSurvey(claim);
  const surveyDone = ["INSPECTION_COMPLETED", "ESTIMATE_SUBMITTED", "SUPPLEMENTARY_ESTIMATE", "TOTAL_LOSS", "APPROVED", "ON_ACCOUNT_PAYMENT", "REPAIR_IN_PROGRESS", "READY_FOR_DELIVERY", "REJECTED", "APPEALED", "SETTLED"].includes(status);
  const info = claimStatus(status, role);
  return STAGES.map((name, index) => {
    let state = index < current ? "complete" : index === current ? "current" : "upcoming";
    if (name === "Survey" && !needsSurvey && !claim?.assignedSurveyor) state = state === "current" ? "complete" : "skipped";
    if (name === "Survey" && surveyDone && state !== "skipped") state = "complete";
    let note = "";
    if (index === 0 && claim?.submittedAt) note = dateShort(claim.submittedAt);
    if (state === "skipped") note = "Not needed";
    if (state === "current") {
      if (status === "REJECTED") note = "Rejected";
      else if (status === "APPEALED") note = "Appeal under review";
      else if (info.family === "action") note = claim?.dueAt ? `Your move · by ${dateShort(claim.dueAt)}` : "Your move";
      else if (claim?.dueAt) note = `By ${dateShort(claim.dueAt)}`;
    }
    if (name === "Decision" && state === "complete" && ["APPROVED", "ON_ACCOUNT_PAYMENT", "REPAIR_IN_PROGRESS", "READY_FOR_DELIVERY", "SETTLED"].includes(status)) note = "Approved";
    const tone = state === "current" ? (status === "REJECTED" ? "critical" : info.family === "action" ? "action" : "") : "";
    return { name, state, note, tone };
  });
}

// One sentence for "Next step" in claim lists.
const NEXT_CUSTOMER = {
  DRAFT: "Finish and submit your claim",
  SUBMITTED: "Claims team checks your claim",
  UNDER_REVIEW: "Claims team reviews your evidence",
  MORE_INFORMATION_REQUIRED: "Send the information requested",
  SURVEYOR_ASSIGNED: "Surveyor books an inspection",
  INSPECTION_SCHEDULED: "Surveyor inspects your vehicle",
  INSPECTION_COMPLETED: "Claims team decides",
  ESTIMATE_SUBMITTED: "Claims team reviews the estimate",
  SUPPLEMENTARY_ESTIMATE: "Claims team reviews the extra estimate",
  TOTAL_LOSS: "Claims team assesses total loss",
  APPROVED: "Claims team releases your payout",
  ON_ACCOUNT_PAYMENT: "Repair continues",
  REPAIR_IN_PROGRESS: "Garage finishes the repair",
  READY_FOR_DELIVERY: "Collect your vehicle",
  REJECTED: "Read the reason; you can appeal",
  APPEALED: "Claims team reviews your appeal",
  SETTLED: "Nothing more to do",
};
const NEXT_STAFF = {
  DRAFT: "Policyholder finishes the draft",
  SUBMITTED: "Start the review",
  UNDER_REVIEW: "Assign a surveyor or assess",
  MORE_INFORMATION_REQUIRED: "Waiting on the policyholder",
  SURVEYOR_ASSIGNED: "Book the inspection",
  INSPECTION_SCHEDULED: "Inspect and submit the report",
  INSPECTION_COMPLETED: "Review the report and decide",
  ESTIMATE_SUBMITTED: "Record a decision",
  SUPPLEMENTARY_ESTIMATE: "Assess the extra estimate",
  TOTAL_LOSS: "Decide the total loss",
  APPROVED: "Process the settlement",
  ON_ACCOUNT_PAYMENT: "Track the repair",
  REPAIR_IN_PROGRESS: "Track the repair",
  READY_FOR_DELIVERY: "Record final settlement",
  REJECTED: "Wait for an appeal",
  APPEALED: "Review the appeal",
  SETTLED: "Closed",
};
export const nextStepText = (status, role = "POLICYHOLDER") =>
  (isStaff(role) ? NEXT_STAFF : NEXT_CUSTOMER)[status] || "Open the claim";

// Chart colours by family, as CSS variables.
export const familyColor = {
  action: "var(--status-action-mark)",
  progress: "var(--status-progress-mark)",
  positive: "var(--status-positive-mark)",
  critical: "var(--status-critical-mark)",
  neutral: "var(--line-control)",
};

// Server-written notes and notifications, in the product's words:
// ISO timestamps become dates, "GC-… is more information required." becomes "GC-…: information requested.",
// and stored document types get their friendly names.
const PHRASES = Object.keys(CLAIM).map((key) => [key, key.toLowerCase().replaceAll("_", " ")]).sort((a, b) => b[1].length - a[1].length);
export function describe(text, role = "POLICYHOLDER") {
  let out = humaniseText(text);
  // Titles sent in capitals ("STATUS CHANGED") read as sentences.
  if (/^[A-Z][A-Z0-9 ]+$/.test(out.trim())) out = out.trim().charAt(0) + out.trim().slice(1).toLowerCase();
  out = out.replace(/\b(GC-\d{4}-[A-Z0-9]+) is ([a-z ]+?)\.(?=\s|$)/g, (match, num, phrase) => {
    const hit = PHRASES.find(([, words]) => words === phrase.trim());
    return hit ? `${num}: ${claimStatus(hit[0], role).label.toLowerCase()}.` : match;
  });
  for (const [type, friendly] of Object.entries(DOC_LABELS)) out = out.split(type).join(friendly);
  return out;
}
