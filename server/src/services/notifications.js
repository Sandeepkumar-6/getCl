import { Notification, User } from "../models/index.js";
import { sendEmail } from "./email.js";
import { sendSms } from "./sms.js";
import { logger } from "../utils/logger.js";

const absoluteLink = (deepLink) =>
  `${(process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].replace(/\/$/, "")}${deepLink}`;

async function attempt(channel, notification, user, send) {
  if (!user) return "SKIPPED";
  try {
    await send();
    return "DELIVERED";
  } catch (error) {
    logger.error("notification_delivery_failed", {
      notificationId: String(notification._id),
      channel,
      recipientId: String(user._id),
      errorMessage: error.message,
    });
    return "FAILED";
  }
}

async function deliver(notification, user) {
  const link = absoluteLink(notification.deepLink || "/portal/notifications");
  const text = `${notification.message} Open getClaim: ${link}`;
  const [email, sms] = await Promise.all([
    attempt("email", notification, user?.email ? user : null, () =>
      sendEmail({ to: user.email, subject: notification.title, text }),
    ),
    attempt("sms", notification, user?.phone ? user : null, () =>
      sendSms({ to: user.phone, text: `${notification.title}: ${text}` }),
    ),
  ]);
  notification.delivery = { email, sms };
  notification.channels = [
    "IN_APP",
    ...(email !== "SKIPPED" ? ["EMAIL"] : []),
    ...(sms !== "SKIPPED" ? ["SMS"] : []),
  ];
  await notification.save();
}

export async function notifyUsers({
  recipients = [], recipientRole, claim, title, message,
  category = "CLAIM", deepLink = "/portal/notifications", eventType, dedupeKeyBase,
}) {
  const ids = [...new Set(recipients.filter(Boolean).map((value) => String(value?._id || value)))];
  const directUsers = await User.find({ _id: { $in: ids }, status: "ACTIVE" });
  const roleUsers = recipientRole
    ? await User.find({ role: recipientRole, status: "ACTIVE" })
    : [];
  const users = [...new Map([...directUsers, ...roleUsers].map((user) => [String(user._id), user])).values()];
  const notifications = await Notification.insertMany(users.map((user) => ({
    recipient: user._id,
    claim,
    title,
    message,
    category,
    deepLink,
    eventType,
    dedupeKey: dedupeKeyBase ? `${dedupeKeyBase}:${user._id}` : undefined,
    channels: ["IN_APP", "EMAIL", "SMS"],
  })));
  await Promise.all(notifications.map((notification, index) => deliver(notification, users[index])));
  return notifications;
}

export async function notifyClaim(claim, title, message) {
  const direct = await notifyUsers({
    recipients: [claim.policyholder, claim.assignedSurveyor, claim.assignedAdmin],
    claim: claim._id,
    title,
    message,
    category: "CLAIM",
    deepLink: `/portal/claims/${claim._id}`,
  });
  if (claim.assignedAdmin) return direct;
  const operations = await notifyUsers({
    recipientRole: "ADMIN",
    claim: claim._id,
    title,
    message,
    category: "OPERATIONS",
    deepLink: `/portal/claims/${claim._id}`,
  });
  return [...direct, ...operations];
}
