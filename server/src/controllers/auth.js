import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { assert } from "../utils/errors.js";
import { persist, removeStoredFile } from "../middleware/uploads.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/email.js";

const DUMMY_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9U2ZJTRpr6pQsz3lYBK5nNq/3rm98e.";
const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const newToken = () => crypto.randomBytes(32).toString("hex");

const safeUser = (user) => {
  const safe = user.toObject();
  for (const field of [
    "password",
    "emailVerificationTokenHash",
    "emailVerificationExpiresAt",
    "passwordResetTokenHash",
    "passwordResetExpiresAt",
    "loginFailedAttempts",
    "loginLockedUntil",
  ])
    delete safe[field];
  if (safe.verificationDocument) {
    delete safe.verificationDocument.storedName;
    delete safe.verificationDocument.storageKey;
  }
  safe.emailVerified = Boolean(safe.emailVerifiedAt);
  return safe;
};

const result = (user) => ({
  user: safeUser(user),
  token: jwt.sign({ id: user._id }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "8h" }),
});

async function issueVerification(user) {
  const token = newToken();
  user.emailVerificationTokenHash = tokenHash(token);
  user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  await sendVerificationEmail(user, token);
}

export const me = (req, res) => res.json(safeUser(req.user));

export async function updateProfile(req, res) {
  Object.assign(req.user, req.body);
  await req.user.save();
  res.json(safeUser(req.user));
}

export async function register(req, res) {
  const user = await User.create({
    ...req.body,
    password: await bcrypt.hash(req.body.password, 12),
    role: "POLICYHOLDER",
    status: "ACTIVE",
    mustChangePassword: false,
  });
  await issueVerification(user);
  res.status(201).json({
    ...result(user),
    message: "Account created. Check your email to verify the address.",
  });
}

export async function applySurveyor(req, res) {
  const { confirmPassword, ...data } = req.body;
  assert(
    !(await User.exists({
      $or: [{ surveyorId: data.surveyorId }, { employeeId: data.surveyorId }],
    })),
    409,
    "This employee or surveyor ID is already registered.",
  );
  const document = await persist(req.file);
  try {
    const user = await User.create({
      ...data,
      password: await bcrypt.hash(data.password, 12),
      role: "SURVEYOR",
      status: "PENDING",
      mustChangePassword: false,
      verificationDocument: document,
    });
    res.status(201).json({
      message: "Your surveyor application was submitted for staff review.",
      application: { _id: user._id, email: user.email, status: user.status },
    });
  } catch (error) {
    await removeStoredFile(document);
    throw error;
  }
}

export async function login(req, res) {
  const user = await User.findOne({ email: req.body.email }).select(
    "+password +loginFailedAttempts +loginLockedUntil",
  );
  const passwordMatches = await bcrypt.compare(
    req.body.password,
    user?.password || DUMMY_PASSWORD_HASH,
  );
  const locked = user?.loginLockedUntil && user.loginLockedUntil > new Date();

  if (!user || !passwordMatches || locked) {
    if (user && !locked) {
      user.loginFailedAttempts = (user.loginFailedAttempts || 0) + 1;
      if (user.loginFailedAttempts >= MAX_LOGIN_FAILURES)
        user.loginLockedUntil = new Date(Date.now() + LOGIN_LOCK_MS);
      await user.save();
    }
    assert(false, 401, "Email or password is incorrect.");
  }

  if (user.loginFailedAttempts || user.loginLockedUntil) {
    user.loginFailedAttempts = 0;
    user.loginLockedUntil = undefined;
    await user.save();
  }
  const status = user.status;
  assert(status !== "PENDING", 403, "Your surveyor application is pending approval.");
  assert(
    status !== "REJECTED",
    403,
    `Your surveyor application was rejected.${user.rejectionReason ? ` Reason: ${user.rejectionReason}` : ""}`,
  );
  assert(
    status === "ACTIVE",
    403,
    "Your account is suspended. Contact an administrator for help.",
  );
  res.json(result(user));
}

export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select("+password");
  assert(
    await bcrypt.compare(req.body.currentPassword, user.password),
    401,
    "Current password is incorrect.",
  );
  assert(
    req.body.currentPassword !== req.body.newPassword,
    422,
    "Choose a new password different from the temporary password.",
  );
  user.password = await bcrypt.hash(req.body.newPassword, 12);
  user.mustChangePassword = false;
  user.passwordChangedAt = new Date();
  await user.save();
  res.json({ message: "Password changed successfully.", ...result(user) });
}

export async function forgotPassword(req, res) {
  const user = await User.findOne({ email: req.body.email, role: "POLICYHOLDER" }).select(
    "+passwordResetTokenHash +passwordResetExpiresAt",
  );
  await bcrypt.compare(req.body.email, DUMMY_PASSWORD_HASH);
  if (user) {
    const token = newToken();
    user.passwordResetTokenHash = tokenHash(token);
    user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    await sendPasswordResetEmail(user, token);
  }
  res.json({
    message: "If that policyholder account exists, password-reset instructions have been sent.",
  });
}

export async function resetPassword(req, res) {
  const user = await User.findOne({
    role: "POLICYHOLDER",
    passwordResetTokenHash: tokenHash(req.body.token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+password +passwordResetTokenHash +passwordResetExpiresAt");
  assert(user, 400, "This password-reset link is invalid or expired.");
  user.password = await bcrypt.hash(req.body.password, 12);
  user.passwordChangedAt = new Date();
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.loginFailedAttempts = 0;
  user.loginLockedUntil = undefined;
  await user.save();
  res.json({ message: "Password reset. You can now log in." });
}

export async function verifyEmail(req, res) {
  const user = await User.findOne({
    role: "POLICYHOLDER",
    emailVerificationTokenHash: tokenHash(req.body.token),
    emailVerificationExpiresAt: { $gt: new Date() },
  }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");
  assert(user, 400, "This verification link is invalid or expired.");
  user.emailVerifiedAt = new Date();
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();
  res.json({ message: "Email verified successfully." });
}

export async function resendVerification(req, res) {
  const user = await User.findOne({ email: req.body.email, role: "POLICYHOLDER" }).select(
    "+emailVerificationTokenHash +emailVerificationExpiresAt",
  );
  await bcrypt.compare(req.body.email, DUMMY_PASSWORD_HASH);
  if (user && !user.emailVerifiedAt) await issueVerification(user);
  res.json({
    message: "If that unverified policyholder account exists, a new link has been sent.",
  });
}
