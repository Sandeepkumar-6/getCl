import { Claim, Policy, Vehicle } from "../models/index.js";
import { assert } from "../utils/errors.js";

export async function ownedVehicle(id, user, { includeArchived = false, includePhotoStorage = false } = {}) {
  const query = Vehicle.findOne({
    _id: id,
    ...(["ADMIN", "SUPER_ADMIN"].includes(user.role) ? {} : { owner: user._id }),
    ...(includeArchived ? {} : { archived: { $ne: true } }),
  });
  if (includePhotoStorage) query.select("+photo.storedName +photo.storageKey +photo.storageProvider");
  const vehicle = await query;
  assert(vehicle, 404, "Vehicle not found in your account.");
  return vehicle;
}

export async function ownedPolicy(id, user, { includeArchived = false } = {}) {
  const policy = await Policy.findOne({
    _id: id,
    ...(["ADMIN", "SUPER_ADMIN"].includes(user.role) ? {} : { policyholder: user._id }),
    ...(includeArchived ? {} : { archived: { $ne: true } }),
  });
  assert(policy, 404, "Policy not found in your account.");
  return policy;
}

export const policyStatus = (policy, onDate = new Date()) => {
  const target = new Date(onDate);
  target.setHours(12, 0, 0, 0);
  if (new Date(policy.expiryDate) < target) return "EXPIRED";
  if (new Date(policy.startDate) > target) return "UPCOMING";
  if (policy.archived || !policy.active) return "INACTIVE";
  return "ACTIVE";
};

export function presentPolicy(policy) {
  const value = policy.toObject ? policy.toObject() : { ...policy };
  if (value.document) {
    value.document = { ...value.document };
    delete value.document.storedName;
    delete value.document.storageKey;
  }
  return { ...value, status: policyStatus(policy) };
}

export async function validatePolicyVehicle(policy, user) {
  const vehicle = await Vehicle.findOne({
    _id: policy.vehicle,
    owner: user._id,
    archived: { $ne: true },
  });
  assert(vehicle, 403, "Vehicle does not belong to you.");
  return vehicle;
}

export async function removeVehicle(vehicle) {
  const hasClaims = await Claim.exists({ vehicle: vehicle._id });
  const hasPolicies = await Policy.exists({
    vehicle: vehicle._id,
    archived: { $ne: true },
  });
  if (hasClaims || hasPolicies) {
    vehicle.archived = true;
    await vehicle.save();
    await Policy.updateMany(
      { vehicle: vehicle._id },
      { active: false, archived: true },
    );
    return "Vehicle archived because it has policy or claim history.";
  }
  await vehicle.deleteOne();
  return "Vehicle removed.";
}

export async function removePolicy(policy) {
  if (await Claim.exists({ policy: policy._id })) {
    policy.active = false;
    policy.archived = true;
    await policy.save();
    return "Policy archived because it has claim history.";
  }
  await policy.deleteOne();
  return "Policy removed.";
}
