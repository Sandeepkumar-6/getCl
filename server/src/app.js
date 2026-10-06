import express from "express";
import crypto from "node:crypto";
import mongoose from "mongoose";
import helmet from "helmet";
import cors from "cors";
import { router } from "./routes/index.js";
import { logger, requestLogger } from "./utils/logger.js";
export const app = express();
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
app.set("trust proxy", Number.isInteger(proxyHops) && proxyHops >= 0 ? proxyHops : 0);
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id", "X-CSRF-Token"],
  maxAge: 86400,
}));
app.use(express.json({ limit: "100kb" }));
app.use("/api", (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
app.use((req, res, next) => {
  const supplied = req.get("x-request-id");
  req.id = supplied && /^[A-Za-z0-9._-]{1,100}$/.test(supplied) ? supplied : crypto.randomUUID();
  res.set("x-request-id", req.id);
  next();
});
app.use(requestLogger);
app.get("/api/health", (req, res) =>
  res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    api: "ok",
    version: "1.1",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "unavailable",
    message:
      mongoose.connection.readyState === 1
        ? "getClaim API is ready."
        : "MongoDB is unavailable. Start MongoDB on 127.0.0.1:27017.",
  }),
);
app.use(
  "/api",
  (req, res, next) => {
    if (mongoose.connection.readyState !== 1)
      return res.status(503).json({
        message: "MongoDB is unavailable. Start MongoDB Server and retry.",
      });
    next();
  },
  router,
);
app.use((req, res) =>
  res.status(404).json({ message: "API endpoint not found." }),
);
app.use((err, req, res, next) => {
  let status = err.status || 500,
    message = err.message;
  if (err.name === "ZodError") {
    status = 422;
    message = err.issues
      .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
      .join("; ");
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern)[0];
    message =
      field === "registrationNumber"
        ? "This registration number is already linked to a vehicle."
        : field === "policyNumber"
          ? "This policy number is already registered."
          : field === "email"
            ? "An account already uses this email address."
            : field === "employeeId"
              ? "This employee ID is already registered."
              : field === "surveyorId"
                ? "This surveyor ID is already registered."
                : `This ${field} is already registered.`;
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid record identifier or date.";
  } else if (err.name === "ValidationError") {
    status = 422;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join("; ");
  } else if (err.code === "LIMIT_FILE_SIZE") {
    status = 413;
    message = "File exceeds the 8 MB limit.";
  } else if (err.name === "VersionError") {
    status = 409;
    message =
      "This record changed while you were editing. Refresh and try again.";
  } else if (err.name === "MulterError") {
    status = 422;
    message = "Upload one supported file at a time.";
  } else if (status >= 500) {
    message =
      "The server could not complete this request. Check the database connection and server logs.";
    logger.error("request_failed", {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      errorName: err.name,
      errorMessage: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
  res.status(status).json({ message });
});
