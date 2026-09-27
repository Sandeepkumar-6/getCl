import "dotenv/config";
import { connectDB } from "./config/db.js";
import { app } from "./app.js";
import { logger } from "./utils/logger.js";
import { startSlaMonitor } from "./services/sla.js";
import { startVehicleAlertMonitor } from "./services/vehicleAlerts.js";
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
try {
  await connectDB();
  startSlaMonitor();
  startVehicleAlertMonitor();
  const port = process.env.PORT || 5000;
  app.listen(port, () => logger.info("server_started", { port, database: "connected" }));
} catch (error) {
  logger.error("database_connection_failed", { errorMessage: error.message });
  process.exit(1);
}
