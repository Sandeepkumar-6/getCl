import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { AuditLog, User } from "../models/index.js";
import { assert } from "../utils/errors.js";
import { sendStoredFile } from "../middleware/uploads.js";
import { paginate } from "../utils/pagination.js";

const publicStaff = (user) => {
  const value = user.toObject();
  delete value.password;
  if (value.verificationDocument) {
    delete value.verificationDocument.storedName;
    delete value.verificationDocument.storageKey;
  }
  return value;
};
const audit = (actor, target, action, previousValue, newValue, note) =>
  AuditLog.create({
    actor: actor._id,
    actorRole: actor.role,
    targetUser: target._id,
    action,
    previousValue,
    newValue,
    note,
  });

export async function listSurveyors(req, res) {
  const query = { role: "SURVEYOR" };
  if (req.query.status) query.status = String(req.query.status);
  res.json(await paginate(User.find(query).sort({ createdAt: -1, _id: -1 }), req.query, publicStaff));
}

export async function reviewSurveyor(req, res) {
  const user = await User.findOne({ _id: req.params.id, role: "SURVEYOR" });
  assert(user, 404, "Surveyor application not found.");
  assert(
    user.status === "PENDING",
    409,
    "Only pending surveyor applications can be reviewed.",
  );
  const previous = user.status;
  if (req.body.decision === "APPROVE") {
    user.status = "ACTIVE";
    user.rejectionReason = "";
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();
  } else {
    user.status = "REJECTED";
    user.rejectionReason = req.body.reason;
  }
  await user.save();
  await audit(
    req.user,
    user,
    req.body.decision === "APPROVE" ? "STAFF_APPROVED" : "STAFF_REJECTED",
    previous,
    user.status,
    req.body.reason || "Surveyor identity and application approved.",
  );
  res.json(publicStaff(user));
}

export async function staffDocument(req, res) {
  const user = await User.findOne({ _id: req.params.id, role: "SURVEYOR" });
  assert(
    user?.verificationDocument?.storedName || user?.verificationDocument?.storageKey,
    404,
    "Verification document not found.",
  );
  await sendStoredFile(res, user.verificationDocument);
}

export async function listStaff(req, res) {
  res.json(
    await paginate(User.find({
        role: { $in: ["SURVEYOR", "ADMIN", "SUPER_ADMIN"] },
      }).sort({ role: 1, createdAt: -1, _id: -1 }), req.query, publicStaff),
  );
}

export async function createAdmin(req, res) {
  const { temporaryPassword, ...data } = req.body;
  assert(
    !(await User.exists({
      $or: [{ employeeId: data.employeeId }, { surveyorId: data.employeeId }],
    })),
    409,
    "This employee or surveyor ID is already registered.",
  );
  const user = await User.create({
    ...data,
    password: await bcrypt.hash(temporaryPassword, 12),
    role: "ADMIN",
    status: "ACTIVE",
    mustChangePassword: true,
  });
  await audit(
    req.user,
    user,
    "STAFF_ROLE_ASSIGNED",
    "",
    user.role,
    `Admin account created with employee ID ${user.employeeId}.`,
  );
  res.status(201).json(publicStaff(user));
}

export async function changeStaffStatus(req, res) {
  const user = await User.findById(req.params.id);
  assert(
    user && ["SURVEYOR", "ADMIN"].includes(user.role),
    404,
    "Staff account not found.",
  );
  assert(
    String(user._id) !== String(req.user._id),
    409,
    "You cannot change your own account status.",
  );
  if (req.user.role === "ADMIN")
    assert(
      user.role === "SURVEYOR",
      403,
      "Admins may only manage Surveyor accounts.",
    );
  const desired = req.body.status;
  assert(
    (desired === "SUSPENDED" && user.status === "ACTIVE") ||
      (desired === "ACTIVE" && user.status === "SUSPENDED"),
    409,
    desired === "ACTIVE"
      ? "Only suspended staff can be reactivated."
      : "Only active staff can be suspended.",
  );
  const previous = user.status;
  user.status = desired;
  await user.save();
  const action = desired === "ACTIVE" ? "STAFF_REACTIVATED" : "STAFF_SUSPENDED";
  await audit(
    req.user,
    user,
    action,
    previous,
    desired,
    `${user.role.replace("_", " ")} account ${desired.toLowerCase()}.`,
  );
  res.json(publicStaff(user));
}

export async function resetStaffPassword(req, res) {
  const user = await User.findById(req.params.id);
  assert(
    user && ["SURVEYOR", "ADMIN"].includes(user.role),
    404,
    "Staff account not found.",
  );
  assert(
    String(user._id) !== String(req.user._id),
    409,
    "Use change password for your own account.",
  );
  const temporaryPassword = `Gc!${crypto.randomBytes(6).toString("hex")}A1`;
  user.password = await bcrypt.hash(temporaryPassword, 12);
  user.mustChangePassword = true;
  user.passwordChangedAt = new Date();
  await user.save();
  await audit(
    req.user,
    user,
    "STAFF_PASSWORD_RESET",
    "",
    "TEMPORARY_PASSWORD_ISSUED",
    "A temporary password was issued. Its value was not stored in the audit log.",
  );
  res.json({
    message:
      "Temporary password created. Share it securely with the staff member.",
    temporaryPassword,
  });
}

export async function staffAudit(req, res) {
  const target = await User.findById(req.params.id);
  assert(
    target && ["SURVEYOR", "ADMIN", "SUPER_ADMIN"].includes(target.role),
    404,
    "Staff account not found.",
  );
  res.json(
    await AuditLog.find({
      $or: [{ targetUser: target._id }, { actor: target._id, claim: null }],
    })
      .populate("actor", "name email role")
      .populate("targetUser", "name email role")
      .sort({ timestamp: -1 })
      .limit(200),
  );
}
