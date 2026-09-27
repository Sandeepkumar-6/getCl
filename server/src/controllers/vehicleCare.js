import { Claim, Policy, Reminder, ServiceRecord, VehicleCheck, VehicleDocument, ClaimDocument, AuditLog, Inspection, RepairUpdate } from "../models/index.js";
import { ownedVehicle, presentPolicy } from "../services/vehicles.js";
import { customerWorkflow } from "../services/workflow.js";
import { assert } from "../utils/errors.js";
import { persist, removeStoredFile, sendStoredFile } from "../middleware/uploads.js";
import { notifyUsers } from "../services/notifications.js";

const careScope = (vehicle, user) =>
  ["ADMIN", "SUPER_ADMIN"].includes(user.role) ? { vehicle: vehicle._id } : { vehicle: vehicle._id, owner: user._id };

export async function overview(req, res) {
  const vehicle = await ownedVehicle(req.params.id, req.user);
  const filter = careScope(vehicle, req.user);
  const [services, checks, reminders, policies, claims, documents] = await Promise.all([
    ServiceRecord.find(filter).select("-documents.storedName -documents.storageKey").sort({ serviceDate: -1 }).limit(100),
    VehicleCheck.find(filter).sort({ checkedAt: -1 }).limit(24),
    Reminder.find(filter).sort({ dueDate: 1 }).limit(100),
    Policy.find({ vehicle: vehicle._id, archived: { $ne: true } }).sort({ expiryDate: -1 }),
    Claim.find({ vehicle: vehicle._id }).select("claimNumber status createdAt submittedAt accident policy assignedSurveyor dueAt").populate("assignedSurveyor", "name").sort({ createdAt: -1 }),
    VehicleDocument.find(filter).select("-storedName -storageKey").sort({ createdAt: -1 }),
  ]);
  const claimIds = claims.map((claim) => claim._id);
  const [claimDocuments, claimEvents, inspections, repairs] = await Promise.all([
    ClaimDocument.find({ claim: { $in: claimIds } }).select("-storedName -storageKey").sort({ createdAt: -1 }),
    AuditLog.find({ claim: { $in: claimIds } }).sort({ timestamp: -1 }).limit(100),
    Inspection.find({ claim: { $in: claimIds } }).select("claim scheduledDate submittedAt inspectionLocation"),
    RepairUpdate.find({ claim: { $in: claimIds } }).select("claim note status createdAt"),
  ]);
  const policyViews = policies.map(presentPolicy);
  const claimViews = claims.map((claim) => ({ ...claim.toObject(), customerWorkflow: customerWorkflow(claim) }));
  const claimHref = (id) => `/portal/claims/${id}`;
  const vehicleHref = `/portal/vehicles/${vehicle._id}`;
  const timeline = [
    { type: "VEHICLE", at: vehicle.createdAt, title: "Vehicle added to getClaim", item: { _id: vehicle._id }, href: vehicleHref },
    ...services.map((item) => ({ type: "SERVICE", at: item.serviceDate, title: item.serviceType, item })),
    ...checks.map((item) => ({ type: "VEHICLE_CHECK", at: item.checkedAt, title: "Monthly vehicle check", item })),
    ...claims.map((item) => ({ type: "CLAIM", at: item.submittedAt || item.createdAt, title: `Claim ${item.claimNumber}`, item })),
    ...policyViews.map((item) => ({ type: "POLICY", at: item.createdAt, title: `Policy ${item.policyNumber} added`, item, href: `/portal/insurance?vehicleId=${vehicle._id}` })),
    ...documents.map((item) => ({ type: "DOCUMENT", at: item.createdAt, title: `${item.title} uploaded`, item })),
    ...claimDocuments.map((item) => ({ type: "CLAIM_DOCUMENT", at: item.createdAt, title: `${item.documentType} uploaded`, item: { _id: item._id }, href: claimHref(item.claim) })),
    ...claimEvents.map((item) => ({ type: "CLAIM_EVENT", at: item.timestamp, title: item.note || item.action.replaceAll("_", " "), item: { _id: item._id }, href: claimHref(item.claim) })),
    ...inspections.filter((item) => item.submittedAt).map((item) => ({ type: "INSPECTION", at: item.submittedAt, title: "Inspection report submitted", item: { _id: item._id }, href: claimHref(item.claim) })),
    ...repairs.map((item) => ({ type: "REPAIR", at: item.createdAt, title: item.note, item: { _id: item._id }, href: claimHref(item.claim) })),
  ].filter((item) => item.at && new Date(item.at) <= new Date()).sort((a, b) => new Date(b.at) - new Date(a.at));
  const today = new Date();
  const documentsWithStatus = documents.map((item) => {
    const value = item.toObject();
    const daysRemaining = value.expiryDate ? Math.ceil((new Date(value.expiryDate) - today) / 86400000) : null;
    return { ...value, daysRemaining, status: daysRemaining === null ? "VALID" : daysRemaining < 0 ? "EXPIRED" : daysRemaining <= 30 ? "EXPIRING_SOON" : "VALID" };
  });
  const documentLibrary = [
    ...documentsWithStatus.map((item) => ({ id: `vehicle-${item._id}`, name: item.title, category: "Vehicle", type: item.documentType, originalName: item.originalName, at: item.createdAt, expiryDate: item.expiryDate, status: item.status, downloadPath: `/vehicles/${vehicle._id}/documents/${item._id}` })),
    ...policyViews.filter((item) => item.document?.originalName).map((item) => ({ id: `policy-${item._id}`, name: `Policy ${item.policyNumber}`, category: "Policy", type: item.coverageType, originalName: item.document.originalName, at: item.updatedAt, expiryDate: item.expiryDate, status: item.status, downloadPath: `/policies/${item._id}/document` })),
    ...claimDocuments.map((item) => ({ id: `claim-${item._id}`, name: item.documentType, category: "Claim", type: claims.find((claim) => String(claim._id) === String(item.claim))?.claimNumber, originalName: item.originalName, at: item.createdAt, status: item.verificationStatus, downloadPath: `/claims/${item.claim}/documents/${item._id}/download` })),
    ...services.flatMap((service) => service.documents.map((item) => ({ id: `service-${item._id}`, name: item.originalName, category: "Service", type: service.serviceType, originalName: item.originalName, at: service.serviceDate, downloadPath: `/vehicles/${vehicle._id}/services/${service._id}/documents/${item._id}` }))),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json({ vehicle, services, checks, reminders, policies: policyViews, claims: claimViews, documents: documentsWithStatus, documentLibrary, timeline });
}

export async function addService(req, res) {
  const vehicle = await ownedVehicle(req.params.id, req.user);
  assert(req.body.odometer >= (vehicle.currentOdometer || 0), 422, "Service mileage cannot be lower than the vehicle's current mileage.");
  const record = await ServiceRecord.create({ ...req.body, vehicle: vehicle._id, owner: req.user._id });
  if (record.odometer >= (vehicle.currentOdometer || 0)) {
    vehicle.currentOdometer = record.odometer;
    vehicle.lastOdometerUpdatedAt = new Date();
  }
  if (record.nextServiceDue) vehicle.nextServiceDueAt = record.nextServiceDue;
  await vehicle.save();
  await notifyUsers({ recipients: [req.user._id], title: "Service record added", message: `${vehicle.registrationNumber}: ${record.serviceType} at ${record.odometer} km was added.`, category: "VEHICLE", deepLink: `/portal/vehicles/${vehicle._id}` });
  res.status(201).json(record);
}

export async function addCheck(req, res) {
  const vehicle = await ownedVehicle(req.params.id, req.user);
  if (req.body.odometer !== undefined)
    assert(req.body.odometer >= (vehicle.currentOdometer || 0), 422, "Check mileage cannot be lower than the vehicle's current mileage.");
  const check = await VehicleCheck.create({ ...req.body, vehicle: vehicle._id, owner: req.user._id });
  if (check.odometer !== undefined && check.odometer >= (vehicle.currentOdometer || 0)) {
    vehicle.currentOdometer = check.odometer;
    vehicle.lastOdometerUpdatedAt = check.checkedAt;
    await vehicle.save();
  }
  await notifyUsers({ recipients: [req.user._id], title: "Vehicle check recorded", message: `${vehicle.registrationNumber}: your latest vehicle check was saved.`, category: "VEHICLE", deepLink: `/portal/vehicles/${vehicle._id}` });
  res.status(201).json(check);
}

export async function addReminder(req, res) {
  const vehicle = await ownedVehicle(req.params.id, req.user);
  const reminder = await Reminder.create({ ...req.body, vehicle: vehicle._id, owner: req.user._id });
  await notifyUsers({ recipients: [req.user._id], title: "Vehicle reminder created", message: `${vehicle.registrationNumber}: ${reminder.title} reminder was added.`, category: "VEHICLE", deepLink: `/portal/vehicles/${vehicle._id}` });
  res.status(201).json(reminder);
}

export async function updateReminder(req, res) {
  const vehicle = await ownedVehicle(req.params.id, req.user);
  const reminder = await Reminder.findOne({ _id: req.params.reminderId, vehicle: vehicle._id, owner: req.user._id });
  assert(reminder, 404, "Reminder not found.");
  reminder.status = req.body.status;
  await reminder.save();
  await notifyUsers({ recipients: [req.user._id], title: "Vehicle reminder updated", message: `${reminder.title} is now ${reminder.status.toLowerCase()}.`, category: "VEHICLE", deepLink: `/portal/vehicles/${reminder.vehicle}` });
  res.json(reminder);
}

export async function addServiceDocument(req, res) {
  const vehicle = await ownedVehicle(req.params.id, req.user);
  const service = await ServiceRecord.findOne({ _id: req.params.serviceId, ...careScope(vehicle, req.user) });
  assert(service, 404, "Service record not found.");
  service.documents.push(await persist(req.file));
  await service.save();
  const document = service.documents.at(-1).toObject();
  delete document.storedName;
  delete document.storageKey;
  res.status(201).json(document);
}

export async function downloadServiceDocument(req, res) {
  const vehicle = await ownedVehicle(req.params.id, req.user);
  const service = await ServiceRecord.findOne({ _id: req.params.serviceId, ...careScope(vehicle, req.user) });
  assert(service, 404, "Service record not found.");
  const document = service.documents.id(req.params.documentId);
  assert(document, 404, "Service document not found.");
  await sendStoredFile(res, document);
}

export async function addVehicleDocument(req, res) {
  const vehicle = await ownedVehicle(req.params.id, req.user);
  const stored = await persist(req.file);
  try {
    const document = await VehicleDocument.create({ ...req.body, ...stored, vehicle: vehicle._id, owner: req.user._id });
    await notifyUsers({ recipients: [req.user._id], title: "Vehicle document uploaded", message: `${vehicle.registrationNumber}: ${document.title} was added.${document.expiryDate ? ` Expiry: ${document.expiryDate.toLocaleDateString("en-IN")}.` : ""}`, category: "VEHICLE", eventType: "DOCUMENT_UPDATED", deepLink: `/portal/vehicles/${vehicle._id}` });
    const value = document.toObject();
    delete value.storedName;
    delete value.storageKey;
    res.status(201).json(value);
  } catch (error) {
    await removeStoredFile(stored);
    throw error;
  }
}

export async function downloadVehicleDocument(req, res) {
  const vehicle = await ownedVehicle(req.params.id, req.user);
  const document = await VehicleDocument.findOne({ _id: req.params.documentId, ...careScope(vehicle, req.user) });
  assert(document, 404, "Vehicle document not found.");
  await sendStoredFile(res, document);
}

export async function deleteVehicleDocument(req, res) {
  const vehicle = await ownedVehicle(req.params.id, req.user);
  const document = await VehicleDocument.findOne({ _id: req.params.documentId, vehicle: vehicle._id, owner: req.user._id });
  assert(document, 404, "Vehicle document not found.");
  await document.deleteOne();
  await removeStoredFile(document);
  res.json({ message: "Vehicle document removed." });
}
