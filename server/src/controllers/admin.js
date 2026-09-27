import { AuditLog, User } from "../models/index.js";
import { event } from "../services/claims.js";
import { assert } from "../utils/errors.js";
import { paginate, pagination } from "../utils/pagination.js";

const safeUserSelect =
  "-verificationDocument.storedName -verificationDocument.storageKey -emailVerificationTokenHash -passwordResetTokenHash -loginFailedAttempts -loginLockedUntil";

export async function listUsers(req, res) {
  res.json(await paginate(User.find().select(safeUserSelect).sort({ createdAt: -1, _id: -1 }), req.query));
}

export async function changeUserStatus(req, res) {
  assert(
    req.params.id !== String(req.user._id),
    409,
    "You cannot deactivate your own account.",
  );
  const user = await User.findOne({ _id: req.params.id, role: "POLICYHOLDER" });
  assert(user, 404, "Policyholder not found.");
  const old = user.status;
  user.status = req.body.active ? "ACTIVE" : "SUSPENDED";
  await user.save();
  await event(
    null,
    req.user,
    "USER_STATUS_CHANGED",
    `${user.email}: ${user.status === "ACTIVE" ? "activated" : "deactivated"}`,
    String(old),
    String(user.status),
  );
  res.json(user);
}

export async function auditLogs(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const [items, total] = await Promise.all([
    AuditLog.find()
      .populate("actor", "name")
      .populate("claim", "claimNumber")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(),
  ]);
  res.json({ items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
}

export async function activeSurveyors(req, res) {
  res.json(
    await User.find({ role: "SURVEYOR", status: "ACTIVE" }).select(
      safeUserSelect,
    ).limit(100),
  );
}
