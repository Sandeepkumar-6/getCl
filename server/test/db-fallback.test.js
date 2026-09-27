import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../src/config/db.js";

test("connectDB falls back to an in-memory MongoDB for local development", async () => {
  process.env.MONGO_URI = "mongodb://127.0.0.1:1/getclaim_db";

  await connectDB();
  assert.equal(mongoose.connection.readyState, 1);

  await disconnectDB();
  assert.equal(mongoose.connection.readyState, 0);
});
