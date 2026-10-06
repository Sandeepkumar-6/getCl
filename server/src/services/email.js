import nodemailer from "nodemailer";
import { logger } from "../utils/logger.js";

export class ConsoleEmailAdapter {
  async send(message) {
    if (process.env.NODE_ENV === "production")
      throw new Error("Configure a production email adapter before sending email.");
    if (process.env.NODE_ENV === "test") return { delivered: true, demo: true };
    logger.info("development_email", message);
    return { delivered: true, demo: true };
  }
}

export const smtpConfigErrors = (env = process.env) =>
  ["SMTP_HOST", "EMAIL_FROM"].filter((key) => !env[key]).map((key) => `${key} is required when EMAIL_TRANSPORT=smtp.`);

export class SmtpEmailAdapter {
  constructor(transporter) {
    this.transporter = transporter;
  }

  static fromEnv(env = process.env) {
    const errors = smtpConfigErrors(env);
    if (errors.length) throw new Error(errors.join(" "));
    const port = Number(env.SMTP_PORT || 587);
    return new SmtpEmailAdapter(
      nodemailer.createTransport({
        host: env.SMTP_HOST,
        port,
        secure: env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
        disableFileAccess: true,
        disableUrlAccess: true,
      }),
    );
  }

  async send({ to, subject, text }) {
    const info = await this.transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
    logger.info("email_sent", { subject, messageId: info.messageId });
    return { delivered: true, messageId: info.messageId };
  }
}

// HTTPS avoids SMTP port restrictions on free hosting.
export class ResendEmailAdapter {
  constructor(env = process.env, fetcher = globalThis.fetch) {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
      throw new Error("RESEND_API_KEY and EMAIL_FROM are required when EMAIL_TRANSPORT=resend.");
    this.apiKey = env.RESEND_API_KEY;
    this.from = env.EMAIL_FROM;
    this.fetcher = fetcher;
  }

  async send({ to, subject, text }) {
    const response = await this.fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [to], subject, text }),
      signal: AbortSignal.timeout(15000),
    });
    // Never log provider response bodies: they can contain recipients or account tokens.
    if (!response.ok) throw new Error(`Email provider rejected delivery (${response.status}).`);
    const result = await response.json();
    if (!result.id) throw new Error("Email provider did not confirm delivery.");
    logger.info("email_sent", { subject, messageId: result.id });
    return { delivered: true, messageId: result.id };
  }
}

// An adapter set explicitly (tests, custom providers) wins; otherwise EMAIL_TRANSPORT picks one.
let override = null;
let smtpAdapter = null;
let resendAdapter = null;
export const setEmailAdapter = (nextAdapter) => {
  override = nextAdapter;
};
const activeAdapter = () => {
  if (override) return override;
  if (process.env.EMAIL_TRANSPORT === "smtp" && process.env.NODE_ENV !== "test")
    return (smtpAdapter ||= SmtpEmailAdapter.fromEnv());
  if (process.env.EMAIL_TRANSPORT === "resend" && process.env.NODE_ENV !== "test")
    return (resendAdapter ||= new ResendEmailAdapter());
  return new ConsoleEmailAdapter();
};
export const sendEmail = (message) => activeAdapter().send(message);

// Account links must not fail the request after the token is saved; the user can ask for a new link.
const sendAccountEmail = async (message) => {
  try {
    return await sendEmail(message);
  } catch (error) {
    logger.error("email_delivery_failed", { subject: message.subject, errorMessage: error.message });
    return { delivered: false };
  }
};

export const sendVerificationEmail = (user, token) =>
  sendAccountEmail({
    to: user.email,
    subject: "Verify your getClaim email",
    text: `Verify your policyholder email within 24 hours: ${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email?token=${token}`,
  });

export const sendPasswordResetEmail = (user, token) =>
  sendAccountEmail({
    to: user.email,
    subject: "Reset your getClaim password",
    text: `Reset your password within 30 minutes: ${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${token}`,
  });
