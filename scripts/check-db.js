import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "server/.env" });
try {
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getclaim_db",
    { serverSelectionTimeoutMS: 4000 },
  );
  console.log("MongoDB is available.");
  await mongoose.disconnect();
} catch {
  console.error(
    "MongoDB is unavailable. Start MongoDB Community Server (Start-Service MongoDB), then retry. ECONNREFUSED 127.0.0.1:27017 means MongoDB Server is not running.",
  );
  process.exitCode = 1;
}
