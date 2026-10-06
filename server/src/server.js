import "dotenv/config";
import { connectDB } from "./config/db.js";
import { app } from "./app.js";
import { logger } from "./utils/logger.js";
import { startSlaMonitor } from "./services/sla.js";
import { startVehicleAlertMonitor } from "./services/vehicleAlerts.js";
import { smtpConfigErrors } from "./services/email.js";
import { productionConfigErrors } from "./config/production.js";
import { User } from "./models/index.js";
if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32 ||
  process.env.JWT_SECRET.startsWith("replace_with")
) {
  logger.error("configuration_error", { message: "Set a long random JWT_SECRET before starting." });
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && (process.env.STORAGE_DRIVER || "local") === "local") {
  logger.error("configuration_error", { message: "Production requires durable storage. Set STORAGE_DRIVER=s3." });
  process.exit(1);
}
if (process.env.EMAIL_TRANSPORT === "smtp" && smtpConfigErrors().length) {
  logger.error("configuration_error", { message: smtpConfigErrors().join(" ") });
  process.exit(1);
}
const productionErrors = productionConfigErrors();
if (productionErrors.length) {
  logger.error("configuration_error", { message: productionErrors.join(" ") });
  process.exit(1);
}
try {
  await connectDB();
  if (process.env.NODE_ENV === "production" && await User.exists({ email: { $in: ["customer@getclaim.in", "neha@getclaim.in", "surveyor@getclaim.in", "admin@getclaim.in", "superadmin@getclaim.in"] } }))
    throw new Error("Demo accounts were found in the production database. Remove demo data before launch.");
  startSlaMonitor();
  startVehicleAlertMonitor();
  const port = process.env.PORT || 5000;
  app.listen(port, () => logger.info("server_started", { port, database: "connected" }));
} catch (error) {
  logger.error("database_connection_failed", { errorMessage: error.message });
  process.exit(1);
}
