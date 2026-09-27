import { Notification, Policy, Reminder, Vehicle, VehicleCheck, VehicleDocument } from "../models/index.js";
import { notifyUsers } from "./notifications.js";
import { logger } from "../utils/logger.js";

const DAY = 86400000;
const daysUntil = (value, now) => Math.ceil((new Date(value) - now) / DAY);

async function emit({ owner, vehicle, eventType, title, message, key }) {
  const dedupeKey = `${key}:${owner}`;
  if (await Notification.exists({ dedupeKey })) return false;
  await notifyUsers({
    recipients: [owner], title, message, category: "VEHICLE", eventType,
    dedupeKeyBase: key, deepLink: `/portal/vehicles/${vehicle}`,
  });
  return true;
}

export async function processVehicleAlerts(now = new Date()) {
  const vehicles = await Vehicle.find({ archived: { $ne: true } }).select("owner registrationNumber currentOdometer nextServiceDueAt");
  let created = 0;
  for (const vehicle of vehicles) {
    if (vehicle.nextServiceDueAt) {
      const days = daysUntil(vehicle.nextServiceDueAt, now);
      if (days <= 30) created += Number(await emit({
        owner: vehicle.owner, vehicle: vehicle._id,
        eventType: days <= 0 ? "SERVICE_DUE" : "SERVICE_APPROACHING",
        title: days <= 0 ? "Service due" : "Service approaching",
        message: `${vehicle.registrationNumber}: service is ${days <= 0 ? "due now" : `due in ${days} days`}.`,
        key: `vehicle-service:${vehicle._id}:${new Date(vehicle.nextServiceDueAt).toISOString().slice(0, 10)}:${days <= 0 ? "due" : "approaching"}`,
      }));
    }
    const lastCheck = await VehicleCheck.findOne({ vehicle: vehicle._id }).sort({ checkedAt: -1 }).select("checkedAt");
    if (!lastCheck || now - lastCheck.checkedAt >= 30 * DAY) created += Number(await emit({
      owner: vehicle.owner, vehicle: vehicle._id, eventType: "MONTHLY_CHECK_DUE",
      title: "Monthly vehicle check due", message: `${vehicle.registrationNumber}: record your tyres, brakes, lights, fluids, and exterior observations.`,
      key: `monthly-check:${vehicle._id}:${now.toISOString().slice(0, 7)}`,
    }));
  }

  const reminders = await Reminder.find({ status: { $in: ["UPCOMING", "DUE"] } }).populate("vehicle", "registrationNumber currentOdometer");
  for (const reminder of reminders) {
    const dateDays = reminder.dueDate ? daysUntil(reminder.dueDate, now) : Infinity;
    const kmRemaining = reminder.dueOdometer !== undefined && reminder.dueOdometer !== null
      ? reminder.dueOdometer - (reminder.vehicle?.currentOdometer || 0) : Infinity;
    const due = dateDays <= 0 || kmRemaining <= 0;
    const approaching = dateDays <= 30 || kmRemaining <= 1000;
    if (!approaching) continue;
    if (due && reminder.status !== "DUE") {
      reminder.status = "DUE";
      await reminder.save();
    }
    created += Number(await emit({
      owner: reminder.owner, vehicle: reminder.vehicle?._id || reminder.vehicle,
      eventType: due ? "SERVICE_DUE" : "SERVICE_APPROACHING",
      title: due ? `${reminder.title} is due` : `${reminder.title} is approaching`,
      message: `${reminder.vehicle?.registrationNumber || "Vehicle"}: ${dateDays !== Infinity ? `${Math.max(0, dateDays)} days` : ""}${dateDays !== Infinity && kmRemaining !== Infinity ? " or " : ""}${kmRemaining !== Infinity ? `${Math.max(0, kmRemaining)} km` : ""} remaining, whichever comes first.`,
      key: `reminder:${reminder._id}:${due ? "due" : "approaching"}`,
    }));
  }

  const documents = await VehicleDocument.find({ expiryDate: { $ne: null } }).populate("vehicle", "registrationNumber");
  for (const document of documents) {
    const days = daysUntil(document.expiryDate, now);
    if (days > 30) continue;
    const eventType = document.documentType === "PUC" ? "PUC_EXPIRING" : "DOCUMENT_EXPIRING";
    created += Number(await emit({
      owner: document.owner, vehicle: document.vehicle?._id || document.vehicle, eventType,
      title: days < 0 ? `${document.title} expired` : `${document.title} expiring`,
      message: `${document.vehicle?.registrationNumber || "Vehicle"}: ${document.title} ${days < 0 ? `expired ${Math.abs(days)} days ago` : `expires in ${days} days`}.`,
      key: `document-expiry:${document._id}:${days < 0 ? "expired" : "expiring"}`,
    }));
  }

  const policies = await Policy.find({ archived: { $ne: true }, active: true }).populate("vehicle", "registrationNumber");
  for (const policy of policies) {
    const days = daysUntil(policy.expiryDate, now);
    if (days > 30) continue;
    created += Number(await emit({
      owner: policy.policyholder, vehicle: policy.vehicle?._id || policy.vehicle, eventType: "INSURANCE_EXPIRING",
      title: days < 0 ? "Insurance expired" : "Insurance renewal approaching",
      message: `${policy.vehicle?.registrationNumber || "Vehicle"}: policy ${policy.policyNumber} ${days < 0 ? "has expired" : `expires in ${days} days`}.`,
      key: `policy-expiry:${policy._id}:${days < 0 ? "expired" : "expiring"}`,
    }));
  }
  return created;
}

export function startVehicleAlertMonitor() {
  const run = () => processVehicleAlerts().catch((error) => logger.error("vehicle_alert_job_failed", { errorMessage: error.message }));
  run();
  const timer = setInterval(run, 6 * 60 * 60 * 1000);
  timer.unref();
  return timer;
}
