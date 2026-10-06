import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { logger } from "../utils/logger.js";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

let memoryServer;

const getMongoUri = () =>
  process.env.MONGO_URI ||
  process.env.TEST_MONGO_URI ||
  "mongodb://127.0.0.1:27017/getclaim_db";

const getDbNameFromUri = (uri) => {
  try {
    const parsed = new URL(uri);
    const name = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    return name || "getclaim_db";
  } catch {
    return "getclaim_db";
  }
};

export const connectDB = async () => {
  const uri = getMongoUri();
  const targetDbName = getDbNameFromUri(uri);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    return mongoose.connection;
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    logger.warn("database_fallback", {
      message: "MongoDB not reachable. Starting a local development database.",
    });

    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }

    const persistent = process.env.NODE_ENV !== "test" && !process.env.NODE_TEST_CONTEXT;
    const instance = { dbName: targetDbName };
    if (persistent) {
      const localUri = new URL(uri);
      if (!["localhost", "127.0.0.1"].includes(localUri.hostname)) throw error;
      const dbPath = fileURLToPath(new URL("../../../.local/mongo/", import.meta.url));
      await fs.mkdir(dbPath, { recursive: true });
      Object.assign(instance, {
        dbPath,
        port: Number(localUri.port || 27017),
        portGeneration: false,
        storageEngine: "wiredTiger",
      });
    }
    memoryServer = await MongoMemoryServer.create({ instance });
    await mongoose.connect(memoryServer.getUri(targetDbName), {
      serverSelectionTimeoutMS: 5000,
    });

    return mongoose.connection;
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};
