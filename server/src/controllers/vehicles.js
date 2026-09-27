import { Vehicle, Policy, Claim, User } from "../models/index.js";
import { randomUUID } from "node:crypto";
import { assert } from "../utils/errors.js";
import { paginate } from "../utils/pagination.js";
import {
  ownedVehicle,
  ownedPolicy,
  validatePolicyVehicle,
  removeVehicle,
  removePolicy,
  policyStatus,
  presentPolicy,
} from "../services/vehicles.js";
import {
  persist,
  removeStoredFile,
  sendStoredFile,
} from "../middleware/uploads.js";
import { notifyUsers } from "../services/notifications.js";

const withStatus = presentPolicy;
export async function listVehicles(req, res) {
  const result = await paginate(Vehicle.find(
      ["ADMIN", "SUPER_ADMIN"].includes(req.user.role)
        ? { archived: { $ne: true } }
        : { owner: req.user._id, archived: { $ne: true } },
    ).sort({ createdAt: 1, _id: 1 }), req.query);
  if (req.query.includePolicies === "true") {
    const rows = result.items || result;
    const policies = await Policy.find({ vehicle: { $in: rows.map(v => v._id) }, archived: { $ne: true } });
    const openClaims = req.query.includeOpenClaim === "true"
      ? await Claim.find({ vehicle: { $in: rows.map(v => v._id) }, status: { $nin: ["SETTLED", "REJECTED"] } }).select("vehicle claimNumber status accident createdAt").sort({ createdAt: -1, _id: -1 })
      : [];
    const items = rows.map(v => ({ ...v.toObject(), policies: policies.filter(p => String(p.vehicle) === String(v._id)).map(withStatus), ...(req.query.includeOpenClaim === "true" ? { openClaim: openClaims.find(c => String(c.vehicle) === String(v._id)) || null } : {}) }));
    res.json(result.items ? { ...result, items } : items);
  } else res.json(result);
}
export async function createVehicle(req, res) {
  if (req.body.currentOdometer !== undefined)
    req.body.lastOdometerUpdatedAt = new Date();
  const vehicle = await Vehicle.create({ ...req.body, owner: req.user._id });
  await notifyUsers({ recipients: [req.user._id], title: "Vehicle added", message: `${vehicle.registrationNumber}: ${vehicle.manufacturer} ${vehicle.model} was added to your account.`, category: "VEHICLE", deepLink: `/portal/vehicles/${vehicle._id}` });
  res.status(201).json(vehicle);
}
export async function getVehicle(req, res) {
  res.json(await ownedVehicle(req.params.id, req.user));
}
export async function setPrimaryVehicle(req, res) {
  const vehicle = await ownedVehicle(req.params.id, req.user);
  await User.updateOne({ _id: req.user._id }, { $set: { primaryVehicle: vehicle._id } });
  res.json({ primaryVehicle: vehicle._id });
}
export async function updateVehicleAppearance(req, res) {
  const vehicle = await ownedVehicle(req.params.id, req.user);
  vehicle.color = req.body.color;
  vehicle.paintCode = req.body.paintCode || "";
  await vehicle.save();
  res.json(vehicle);
}
export async function uploadVehiclePhoto(req, res) {
  const vehicle = await ownedVehicle(req.params.id, req.user, { includePhotoStorage: true });
  assert(req.file && ["image/jpeg", "image/png"].includes(req.file.mimetype), 422, "Choose a JPG or PNG vehicle photo, up to 8 MB.");
  const previous = vehicle.photo?.toObject();
  const stored = await persist(req.file);
  vehicle.photo = { ...stored, version: randomUUID() };
  try {
    await vehicle.save();
  } catch (error) {
    await removeStoredFile(stored);
    throw error;
  }
  if (previous) await removeStoredFile(previous);
  const { originalName, mimeType, fileSize, version } = vehicle.photo;
  res.json({ photo: { originalName, mimeType, fileSize, version } });
}
export async function getVehiclePhoto(req, res) {
  const vehicle = await Vehicle.findById(req.params.id).select("+photo.storedName +photo.storageKey +photo.storageProvider");
  const allowed = vehicle && (
    ["ADMIN", "SUPER_ADMIN"].includes(req.user.role) ||
    String(vehicle.owner) === String(req.user._id) ||
    (req.user.role === "SURVEYOR" && await Claim.exists({ vehicle: vehicle._id, assignedSurveyor: req.user._id }))
  );
  assert(allowed, 404, "Vehicle photo not found.");
  assert(vehicle.photo?.storedName || vehicle.photo?.storageKey, 404, "Vehicle photo not found.");
  res.set("Cache-Control", "private, no-store");
  await sendStoredFile(res, vehicle.photo);
}
export async function updateVehicle(req, res) {
  const item = await ownedVehicle(req.params.id, req.user);
  assert(
    !(await Claim.exists({ vehicle: item._id, status: { $ne: "DRAFT" } })),
    409,
    "This vehicle is linked to a submitted claim and cannot be changed.",
  );
  if (req.body.currentOdometer !== undefined && req.body.currentOdometer !== item.currentOdometer)
    req.body.lastOdometerUpdatedAt = new Date();
  if (req.body.currentOdometer !== undefined)
    assert(req.body.currentOdometer >= (item.currentOdometer || 0), 422, "Mileage cannot be lower than the current reading.");
  Object.assign(item, req.body);
  item.verificationStatus = "USER_ADDED";
  item.verificationReason = undefined;
  await item.save();
  await notifyUsers({ recipients: [req.user._id], title: "Vehicle details updated", message: `${item.registrationNumber}: vehicle details were updated.`, category: "VEHICLE", deepLink: `/portal/vehicles/${item._id}` });
  res.json(item);
}
export async function updateOdometer(req, res) {
  const item = await ownedVehicle(req.params.id, req.user);
  assert(req.body.currentOdometer >= (item.currentOdometer || 0), 422, "Mileage cannot be lower than the current reading.");
  item.currentOdometer = req.body.currentOdometer;
  item.lastOdometerUpdatedAt = new Date();
  await item.save();
  await notifyUsers({ recipients: [req.user._id], title: "Mileage updated", message: `${item.registrationNumber}: mileage is now ${item.currentOdometer.toLocaleString("en-IN")} km.`, category: "VEHICLE", eventType: "MILEAGE_UPDATED", deepLink: `/portal/vehicles/${item._id}` });
  res.json(item);
}
export async function deleteVehicle(req, res) {
  const item = await ownedVehicle(req.params.id, req.user);
  const message = await removeVehicle(item);
  await notifyUsers({ recipients: [req.user._id], title: "Vehicle record updated", message: `${item.registrationNumber}: ${message}`, category: "VEHICLE", deepLink: "/portal/vehicles" });
  res.json({ message });
}

export async function listPolicies(req, res) {
  const query =
    ["ADMIN", "SUPER_ADMIN"].includes(req.user.role)
      ? { archived: { $ne: true } }
      : { policyholder: req.user._id, archived: { $ne: true } };
  if (req.query.vehicleId) {
    await ownedVehicle(req.query.vehicleId, req.user);
    query.vehicle = req.query.vehicleId;
  }
  res.json(await paginate(Policy.find(query).sort({ startDate: -1, _id: -1 }), req.query, withStatus));
}
export async function createPolicy(req, res) {
  await validatePolicyVehicle(req.body, req.user);
  const policy = await Policy.create({
    ...req.body,
    policyholder: req.user._id,
  });
  await notifyUsers({ recipients: [req.user._id], title: "Insurance policy added", message: `${policy.policyNumber}: policy information was added and is marked user provided until verified.`, category: "VEHICLE", deepLink: "/portal/insurance" });
  res.status(201).json(withStatus(policy));
}
export async function getPolicy(req, res) {
  res.json(withStatus(await ownedPolicy(req.params.id, req.user)));
}
export async function updatePolicy(req, res) {
  const item = await ownedPolicy(req.params.id, req.user);
  assert(
    !(await Claim.exists({ policy: item._id, status: { $ne: "DRAFT" } })),
    409,
    "This policy is linked to a submitted claim and cannot be changed.",
  );
  await validatePolicyVehicle(req.body, req.user);
  Object.assign(item, req.body);
  item.verificationStatus = "USER_ADDED";
  item.verificationReason = undefined;
  await item.save();
  await notifyUsers({ recipients: [req.user._id], title: "Insurance policy updated", message: `${item.policyNumber}: policy details were updated and require verification.`, category: "VEHICLE", deepLink: "/portal/insurance" });
  res.json(withStatus(item));
}
export async function deletePolicy(req, res) {
  const item = await ownedPolicy(req.params.id, req.user);
  const retained = await Claim.exists({ policy: item._id });
  if (!retained) await removeStoredFile(item.document);
  const message = await removePolicy(item);
  await notifyUsers({ recipients: [req.user._id], title: "Insurance policy record updated", message: `${item.policyNumber}: ${message}`, category: "VEHICLE", deepLink: "/portal/insurance" });
  res.json({ message });
}
export async function uploadPolicyDocument(req, res) {
  const item = await ownedPolicy(req.params.id, req.user);
  const previous = item.document?.toObject?.() || item.document;
  item.document = await persist(req.file);
  item.verificationStatus = "PENDING_VERIFICATION";
  item.verificationReason = undefined;
  await item.save();
  if (previous && previous.storedName !== item.document.storedName)
    await removeStoredFile(previous);
  await notifyUsers({ recipients: [req.user._id], title: "Policy document uploaded", message: `${item.policyNumber}: your document is awaiting verification.`, category: "VEHICLE", deepLink: "/portal/insurance" });
  res.json({
    ...withStatus(item),
    document: {
      originalName: item.document.originalName,
      mimeType: item.document.mimeType,
      fileSize: item.document.fileSize,
    },
  });
}
export async function downloadPolicyDocument(req, res) {
  const item = await ownedPolicy(req.params.id, req.user);
  assert(item.document?.storedName, 404, "Policy document not found.");
  await sendStoredFile(res, item.document);
}

export async function verifyVehicle(req, res) {
  const item = await ownedVehicle(req.params.id, req.user, { includeArchived: true });
  item.verificationStatus = req.body.verificationStatus;
  item.verificationReason = req.body.verificationReason;
  await item.save();
  await notifyUsers({ recipients: [item.owner], title: "Vehicle verification updated", message: `${item.registrationNumber}: verification is ${item.verificationStatus.replaceAll("_", " ").toLowerCase()}.${item.verificationReason ? ` ${item.verificationReason}` : ""}`, category: "VEHICLE", deepLink: `/portal/vehicles/${item._id}` });
  res.json(item);
}

export async function verifyPolicy(req, res) {
  const item = await ownedPolicy(req.params.id, req.user, { includeArchived: true });
  item.verificationStatus = req.body.verificationStatus;
  item.verificationReason = req.body.verificationReason;
  await item.save();
  await notifyUsers({ recipients: [item.policyholder], title: "Policy verification updated", message: `${item.policyNumber}: verification is ${item.verificationStatus.replaceAll("_", " ").toLowerCase()}.${item.verificationReason ? ` ${item.verificationReason}` : ""}`, category: "VEHICLE", deepLink: "/portal/insurance" });
  res.json(withStatus(item));
}
