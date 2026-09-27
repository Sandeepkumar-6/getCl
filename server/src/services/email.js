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

let adapter = new ConsoleEmailAdapter();
export const setEmailAdapter = (nextAdapter) => {
  adapter = nextAdapter;
};
export const sendEmail = (message) => adapter.send(message);

export const sendVerificationEmail = (user, token) =>
  sendEmail({
    to: user.email,
    subject: "Verify your getClaim email",
    text: `Verify your policyholder email within 24 hours: ${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email?token=${token}`,
  });

export const sendPasswordResetEmail = (user, token) =>
  sendEmail({
    to: user.email,
    subject: "Reset your getClaim password",
    text: `Reset your password within 30 minutes: ${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${token}`,
  });
