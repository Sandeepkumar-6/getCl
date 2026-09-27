import {
  Claim,
  Policy,
  ClaimDocument,
  AuditLog,
} from "../models/index.js";
import { assert } from "../utils/errors.js";
import { transitions, applyClock, requiredDocuments } from "./workflow.js";
import { notifyClaim } from "./notifications.js";
export { transitions } from "./workflow.js";
export const scope = (user) =>
  ["ADMIN", "SUPER_ADMIN"].includes(user.role)
    ? {}
    : user.role === "SURVEYOR"
      ? { assignedSurveyor: user._id }
      : { policyholder: user._id };
export async function accessible(id, user) {
  const claim = await Claim.findById(id);
  assert(claim, 404, "Claim not found.");
  assert(
    ["ADMIN", "SUPER_ADMIN"].includes(user.role) ||
      String(
        claim[user.role === "SURVEYOR" ? "assignedSurveyor" : "policyholder"],
      ) === String(user._id),
    403,
    "You do not have access to this claim.",
  );
  return claim;
}
export async function event(
  claim,
  user,
  action,
  note,
  previousValue = "",
  newValue = "",
) {
  await AuditLog.create({
    claim: claim?._id,
    actor: user._id,
    actorRole: user.role,
    action,
    note,
    previousValue,
    newValue,
  });
  if (claim) {
    await notifyClaim(claim, action.replaceAll("_", " "), `${claim.claimNumber}: ${note}`);
  }
}
export async function move(claim, status, user, note) {
  assert(
    transitions[claim.status]?.includes(status),
    409,
    `Cannot move a ${claim.status} claim to ${status}. Complete the preceding workflow step.`,
  );
  const previous = claim.status;
  claim.status = status;
  applyClock(claim, status);
  await claim.save();
  await event(claim, user, "STATUS_CHANGED", note, previous, status);
  return claim;
}
export async function readiness(claim) {
  const p = await Policy.findById(claim.policy);
  const a = claim.accident || {},
    coverageDate = a.date ? new Date(a.date) : new Date(),
    docs = await ClaimDocument.find({
      claim: claim._id,
      verificationStatus: { $ne: "REJECTED" },
    });
  const has = (t) => docs.some((d) => d.documentType === t);
  const rules = [
    [
      "Vehicle and policy covering the accident date",
      15,
      !!p &&
        p.active &&
        !p.archived &&
        p.expiryDate >= coverageDate &&
        p.startDate <= coverageDate,
    ],
    ["Accident date and time", 15, !!a.date && !!a.time],
    ["Location and landmark", 15, !!a.location && !!a.landmark],
    [
      "Detailed description (at least 50 characters)",
      20,
      (a.description?.length || 0) >= 50,
    ],
    [
      "Accident classification, weather and road",
      10,
      !!a.type && !!a.weather && !!a.road,
    ],
    [
      "Police and third-party details when required",
      10,
      ((!a.injury && !a.thirdParty) ||
        (!!claim.police?.number && !!claim.police?.station)) &&
        (!a.thirdParty ||
          (!!claim.thirdParty?.name && !!claim.thirdParty?.phone)) &&
        (!a.injury || !!claim.thirdParty?.injuryDescription),
    ],
    [
      "Documents required for this claim type",
      15,
      requiredDocuments(claim).every(has),
    ],
  ];
  return {
    score: rules.reduce(
      (n, [, weight, complete]) => n + (complete ? weight : 0),
      0,
    ),
    rules: rules.map(([label, weight, complete]) => ({
      label,
      weight,
      complete,
    })),
    missing: rules.filter((r) => !r[2]).map((r) => r[0]),
  };
}
