import { Claim } from "../models/index.js";
import { notifyClaim } from "./notifications.js";
import { logger } from "../utils/logger.js";
export async function markSlaBreaches(now = new Date()) {
  const claims = await Claim.find({ dueAt: { $lt: now }, breachedAt: null, status: { $nin: ["DRAFT", "SETTLED", "REJECTED"] } });
  for (const claim of claims) {
    const marked = await Claim.updateOne({ _id: claim._id, dueAt: claim.dueAt, breachedAt: null }, { $set: { breachedAt: now } });
    if (marked.modifiedCount) await notifyClaim(claim, "Claim deadline missed", `${claim.claimNumber}: ${claim.status.replaceAll("_", " ")} is overdue. Review the timeline or raise a grievance.`);
  }
  return claims.length;
}
export function startSlaMonitor() {
  const run = () => markSlaBreaches().catch((error) => logger.error("sla_job_failed", { errorMessage: error.message }));
  run();
  const timer = setInterval(run, 60000);
  timer.unref();
  return timer;
}
