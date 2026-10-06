import jwt from "jsonwebtoken";
import { User, RevokedSession } from "../models/index.js";
import crypto from "node:crypto";
import { assert } from "../utils/errors.js";
import { hasPermission } from "../config/permissions.js";
import { readSession, validCsrf } from "./session.js";
import { isPublicDemo, seededDemoEmails } from "../config/demo.js";

export async function auth(req, res, next) {
  const { token, fromCookie, csrf } = readSession(req);
  assert(token, 401, "Please log in to continue.");
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    assert(
      false,
      401,
      "Your session expired or is invalid. Please log in again.",
    );
  }
  if (fromCookie && !["GET", "HEAD", "OPTIONS"].includes(req.method))
    assert(validCsrf(req, decoded, req.get("x-csrf-token"), csrf), 403, "Your session security check failed. Refresh and try again.");
  if (fromCookie) {
    assert(decoded.jti, 401, "Please sign in again.");
    assert(!(await RevokedSession.exists({ tokenHash: crypto.createHash("sha256").update(decoded.jti).digest("hex") })), 401, "This session has ended. Sign in again.");
  }
  req.sessionJwt = decoded;
  req.user = await User.findById(decoded.id);
  assert(req.user, 401, "This account no longer exists.");
  assert(
    (decoded.v ?? 0) === (req.user.authVersion || 0),
    401,
    "Your password changed after this session began. Please log in again.",
  );
  const status = req.user.status;
  assert(
    status === "ACTIVE",
    401,
    status === "PENDING"
      ? "Your surveyor application is pending approval."
      : status === "REJECTED"
        ? "Your surveyor application was rejected."
        : "Your account is suspended.",
  );
  const passwordRoutes = ["/auth/me", "/auth/change-password"];
  assert(
    !req.user.mustChangePassword || passwordRoutes.includes(req.path),
    403,
    "Change your temporary password before using the workspace.",
  );
  if (isPublicDemo() && seededDemoEmails.includes(req.user.email) && !["GET", "HEAD", "OPTIONS"].includes(req.method) && req.path !== "/auth/logout")
    assert(false, 403, "Shared demo accounts are view-only. Create your own demo account to try changes.");
  next();
}
export const roles =
  (...allowed) =>
  (req, res, next) => {
    assert(
      allowed.includes(req.user.role),
      403,
      "Your role cannot perform this action.",
    );
    next();
  };

export const permit =
  (...required) =>
  (req, res, next) => {
    assert(
      required.some((permission) => hasPermission(req.user.role, permission)),
      403,
      "Your role cannot perform this action.",
    );
    next();
  };

export const verifiedPolicyholder = (req, res, next) => {
  assert(
    req.user.role !== "POLICYHOLDER" || req.user.emailVerifiedAt,
    403,
    "Verify your email address before changing policy or claim records.",
  );
  next();
};
