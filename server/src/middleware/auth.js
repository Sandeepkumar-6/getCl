import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { assert } from "../utils/errors.js";
import { hasPermission } from "../config/permissions.js";

export async function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
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
  req.user = await User.findById(decoded.id);
  assert(req.user, 401, "This account no longer exists.");
  const passwordChangedAt = req.user.passwordChangedAt?.getTime() / 1000;
  assert(
    !passwordChangedAt || passwordChangedAt <= decoded.iat,
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
