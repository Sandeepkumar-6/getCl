export const currentPolicy = (policies = []) => policies.find((p) => p.status === "ACTIVE") || policies.find((p) => p.status === "UPCOMING") || policies[0];
export const activeClaims = (claims = []) => claims.filter((claim) => !["DRAFT", "REJECTED", "SETTLED"].includes(claim.status));
export const dayDifference = (value, now = new Date()) => {
  if (!value) return null;
  const target = new Date(value), today = new Date(now);
  target.setHours(0, 0, 0, 0); today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

// Every reminder is sourced from a saved record; no invented schedules.
export function vehicleReminders(data, now = new Date()) {
  const vehicle = data.vehicle;
  const careLink = `/portal/vehicles/${vehicle._id}`;
  const rows = (data.reminders || []).filter((r) => !["COMPLETED", "DISMISSED"].includes(r.status)).map((r) => ({ id: `reminder-${r._id}`, recordId: r._id, title: r.title, source: "Saved reminder", dueDate: r.dueDate, dueOdometer: r.dueOdometer, type: r.type, href: `${careLink}#reminders` }));
  const hasSavedDate = (types, dueDate) => rows.some((row) => types.includes(row.type) && row.dueDate && dayDifference(row.dueDate, dueDate) === 0);
  const policy = currentPolicy(data.policies);
  if (policy?.expiryDate && policy.status !== "INACTIVE" && !hasSavedDate(["INSURANCE_RENEWAL"], policy.expiryDate)) rows.push({ id: `policy-${policy._id}`, title: "Insurance renewal", source: policy.policyNumber, dueDate: policy.expiryDate, type: "INSURANCE_RENEWAL", href: `/portal/insurance?vehicleId=${vehicle._id}` });
  if (vehicle.nextServiceDueAt && !hasSavedDate(["SERVICE"], vehicle.nextServiceDueAt)) rows.push({ id: "service-schedule", title: "Next vehicle service", source: "Your saved service schedule", dueDate: vehicle.nextServiceDueAt, type: "SERVICE", href: `${careLink}#service` });
  for (const doc of data.documents || []) if (doc.expiryDate && doc.documentType !== "INSURANCE" && !hasSavedDate([doc.documentType], doc.expiryDate)) rows.push({ id: `expiry-${doc._id}`, title: `${doc.title} expiry`, source: doc.documentType, dueDate: doc.expiryDate, type: "DOCUMENT_EXPIRY", href: `/portal/documents?vehicleId=${vehicle._id}` });
  for (const claim of data.claims || []) if (claim.status === "MORE_INFORMATION_REQUIRED") rows.push({ id: `claim-${claim._id}`, title: "Respond to the claims team", source: claim.claimNumber, dueDate: claim.dueAt, required: true, type: "CLAIM_ACTION", href: `/portal/claims/${claim._id}` });
  return rows.map((row) => ({ ...row, days: dayDifference(row.dueDate, now), due: Boolean(row.required || (row.dueDate && dayDifference(row.dueDate, now) <= 0) || (row.dueOdometer != null && vehicle.currentOdometer != null && row.dueOdometer <= vehicle.currentOdometer)) }))
    .sort((a, b) => Number(b.due) - Number(a.due) || (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity));
}
