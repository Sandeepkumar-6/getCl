import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../src/models/index.js";
import { productionConfigErrors } from "../src/config/production.js";

// Run once from the Render shell with temporary variables supplied in its dashboard.
async function bootstrap() {
  if (process.env.NODE_ENV !== "production" || productionConfigErrors().length)
    throw new Error("A complete production configuration is required.");
  const { BOOTSTRAP_ADMIN_NAME: name, BOOTSTRAP_ADMIN_EMAIL: email, BOOTSTRAP_ADMIN_PHONE: phone, BOOTSTRAP_ADMIN_PASSWORD: password } = process.env;
  if (!name || !phone || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 16 || password.length > 72)
    throw new Error("Set the owner's name, email, phone and a unique 16–72 character temporary password in BOOTSTRAP_ADMIN variables.");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  if (await User.exists({ role: "SUPER_ADMIN" }) || await User.exists({ email: email.trim().toLowerCase() }))
    throw new Error("An owner or this email already exists. No account was changed.");
  await User.create({ name, email: email.trim().toLowerCase(), phone, password: await bcrypt.hash(password, 12), role: "SUPER_ADMIN", status: "ACTIVE", mustChangePassword: true, emailVerifiedAt: new Date() });
  console.log("Initial owner created. Email second-factor verification and password change are required at sign-in. Remove the temporary BOOTSTRAP_ADMIN variables.");
}
try { await bootstrap(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
