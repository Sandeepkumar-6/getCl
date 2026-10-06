import { isPublicDemo } from "./demo.js";

export function productionConfigErrors(env = process.env) {
  if (env.NODE_ENV !== "production") return [];
  const errors = [];
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 64 || env.JWT_SECRET.startsWith("replace_with"))
    errors.push("JWT_SECRET must be a new random secret of at least 64 characters.");
  try {
    const url = new URL(env.CLIENT_URL);
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password)
      errors.push("CLIENT_URL must be an HTTPS origin without a path or credentials.");
  } catch { errors.push("CLIENT_URL must be a valid HTTPS origin."); }
  let databaseName;
  try {
    const url = new URL(env.MONGO_URI);
    databaseName = url.pathname.replace(/^\//, "");
    if (!env.MONGO_URI || !["mongodb:", "mongodb+srv:"].includes(url.protocol) || ["localhost", "127.0.0.1", "::1"].includes(url.hostname))
      errors.push("MONGO_URI must point to a managed production MongoDB database.");
  } catch { errors.push("MONGO_URI must be configured for production."); }
  if (isPublicDemo(env) && databaseName !== "getclaim_prod")
    errors.push("Public demo requires the dedicated Atlas getclaim_prod database.");
  if (!isPublicDemo(env) && (env.STORAGE_DRIVER !== "s3" || !env.S3_BUCKET))
    errors.push("STORAGE_DRIVER=s3 and S3_BUCKET are required in production.");
  const smtpReady = env.EMAIL_TRANSPORT === "smtp" && env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM;
  const resendReady = env.EMAIL_TRANSPORT === "resend" && env.RESEND_API_KEY && env.EMAIL_FROM;
  if (!isPublicDemo(env) && !smtpReady && !resendReady)
    errors.push("Authenticated SMTP or Resend HTTPS email must be configured in production.");
  if (!isPublicDemo(env) && !env.CLAMAV_HOST)
    errors.push("CLAMAV_HOST is required to scan production uploads.");
  return errors;
}
