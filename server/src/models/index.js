import mongoose from "mongoose";
import { statuses } from "../../../shared/claimStatuses.js";
const { Schema } = mongoose;
const ref = (model, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: model,
  required,
});
const str = (required = false) => ({
  type: String,
  trim: true,
  required,
  maxlength: 5000,
});
const money = { type: Number, min: 0, default: 0, validate: Number.isSafeInteger };
const storedFileFields = () => ({
  originalName: str(true),
  storedName: str(true),
  storageProvider: { type: String, default: "local" },
  storageKey: String,
  mimeType: str(true),
  fileSize: { type: Number, max: 8388608 },
});
export { statuses };
const model = (name, shape, indexes = []) => {
  const s = new Schema(shape, {
    timestamps: true,
    optimisticConcurrency: true,
  });
  indexes.forEach((i) => s.index(i));
  return mongoose.model(name, s);
};
export const User = model("User", {
  name: str(true),
  email: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
    unique: true,
  },
  phone: str(true),
  password: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ["POLICYHOLDER", "SURVEYOR", "ADMIN", "SUPER_ADMIN"],
    default: "POLICYHOLDER",
  },
  status: {
    type: String,
    enum: ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"],
    default: "ACTIVE",
  },
  address: str(),
  primaryVehicle: ref("Vehicle", false),
  city: str(),
  state: str(),
  pincode: str(),
  surveyorRegion: str(),
  employeeId: {
    type: String,
    trim: true,
    uppercase: true,
    unique: true,
    sparse: true,
  },
  surveyorId: {
    type: String,
    trim: true,
    uppercase: true,
    unique: true,
    sparse: true,
  },
  qualification: str(),
  experience: { type: Number, min: 0, max: 70 },
  verificationDocument: {
    originalName: String,
    storedName: String,
    storageProvider: { type: String, default: "local" },
    storageKey: String,
    mimeType: String,
    fileSize: Number,
  },
  rejectionReason: str(),
  mustChangePassword: { type: Boolean, default: false },
  passwordChangedAt: Date,
  authVersion: { type: Number, default: 0 },
  emailVerifiedAt: Date,
  emailVerificationTokenHash: { type: String, select: false },
  emailVerificationExpiresAt: { type: Date, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  loginFailedAttempts: { type: Number, default: 0, select: false },
  loginLockedUntil: { type: Date, select: false },
  mfaChallengeHash: { type: String, select: false },
  mfaCodeHash: { type: String, select: false },
  mfaExpiresAt: { type: Date, select: false },
  mfaIssuedAt: { type: Date, select: false },
  mfaAttempts: { type: Number, default: 0, select: false },
  approvedBy: ref("User", false),
  approvedAt: Date,
});
export const RevokedSession = model("RevokedSession", {
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
}, [{ expiresAt: 1, expireAfterSeconds: 0 }]);
export const Vehicle = model("Vehicle", {
  owner: ref("User"),
  registrationNumber: {
    type: String,
    uppercase: true,
    trim: true,
    unique: true,
    required: true,
  },
  manufacturer: str(true),
  model: str(true),
  variant: str(),
  color: { type: String, trim: true, maxlength: 80 },
  paintCode: { type: String, trim: true, maxlength: 40 },
  manufacturingYear: { type: Number, min: 1950, max: 2100 },
  chassisNumber: str(),
  engineNumber: str(),
  vehicleType: str(),
  fuelType: str(),
  photo: {
    type: new Schema({
      originalName: String,
      mimeType: String,
      fileSize: Number,
      version: String,
      storedName: { type: String, select: false },
      storageKey: { type: String, select: false },
      storageProvider: { type: String, select: false },
    }, { _id: false }),
    default: undefined,
  },
  currentOdometer: { type: Number, min: 0 },
  lastOdometerUpdatedAt: Date,
  serviceIntervalKm: { type: Number, min: 1000, max: 100000, default: 10000 },
  serviceIntervalMonths: { type: Number, min: 1, max: 60, default: 12 },
  nextServiceDueAt: Date,
  verificationStatus: {
    type: String,
    enum: ["USER_ADDED", "PENDING_VERIFICATION", "VERIFIED", "REJECTED"],
    default: "USER_ADDED",
  },
  verificationReason: str(),
  archived: { type: Boolean, default: false },
});
export const Policy = model("Policy", {
  policyholder: ref("User"),
  vehicle: ref("Vehicle"),
  policyNumber: {
    type: String,
    uppercase: true,
    unique: true,
    trim: true,
    required: true,
  },
  insurer: str(true),
  coverageType: {
    type: String,
    enum: ["Comprehensive", "Third-party", "Own damage"],
    default: "Comprehensive",
  },
  claimTypes: [{ type: String, enum: ["Cashless", "Reimbursement"] }],
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  insuredDeclaredValue: money,
  deductible: money,
  voluntaryDeductible: money,
  zeroDepreciation: { type: Boolean, default: false },
  ncbPercent: { type: Number, min: 0, max: 100, default: 0 },
  ownDamagePremium: money,
  moneyVersion: { type: Number, default: 2 },
  cashlessGarageAvailable: { type: Boolean, default: false },
  document: {
    originalName: String,
    storedName: String,
    storageProvider: { type: String, default: "local" },
    storageKey: String,
    mimeType: String,
    fileSize: Number,
  },
  active: { type: Boolean, default: true },
  archived: { type: Boolean, default: false },
  verificationStatus: {
    type: String,
    enum: ["USER_ADDED", "PENDING_VERIFICATION", "VERIFIED", "REJECTED"],
    default: "USER_ADDED",
  },
  verificationReason: str(),
});
export const Claim = model(
  "Claim",
  {
    claimNumber: { type: String, unique: true, required: true },
    policyholder: ref("User"),
    vehicle: ref("Vehicle"),
    policy: ref("Policy"),
    assignedSurveyor: ref("User", false),
    assignedAdmin: ref("User", false),
    claimType: { type: String, enum: ["OWN_DAMAGE", "THIRD_PARTY", "THEFT", "TOTAL_LOSS"], default: "OWN_DAMAGE" },
    estimatedLoss: money,
    garageId: String,
    dueAt: Date,
    breachedAt: Date,
    surveyAllocatedAt: Date,
    decisionDueAt: Date,
    moneyVersion: { type: Number, default: 2 },
    accident: {
      date: Date,
      time: String,
      type: { type: String },
      claimType: { type: String, enum: ["Cashless", "Reimbursement"] },
      location: String,
      landmark: String,
      description: String,
      weather: String,
      road: String,
      driveable: Boolean,
      injury: Boolean,
      thirdParty: Boolean,
    },
    police: { number: String, station: String, date: Date },
    thirdParty: {
      name: String,
      registration: String,
      phone: String,
      injuryDescription: String,
    },
    status: { type: String, enum: statuses, default: "DRAFT" },
    readinessScore: { type: Number, min: 0, max: 100, default: 0 },
    customerResponse: str(),
    declarationAccepted: { type: Boolean, default: false },
    submittedAt: Date,
  },
  [{ policyholder: 1, status: 1 }, { assignedSurveyor: 1 }, { createdAt: -1 }],
);
export const ClaimDocument = model("ClaimDocument", {
  claim: ref("Claim"),
  uploadedBy: ref("User"),
  documentType: str(true),
  ...storedFileFields(),
  verificationStatus: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "REJECTED"],
    default: "PENDING",
  },
  rejectionReason: str(),
  capturedAt: Date,
  location: { latitude: Number, longitude: Number },
});
export const Inspection = model("Inspection", {
  claim: { ...ref("Claim"), unique: true },
  surveyor: ref("User"),
  scheduledDate: { type: Date, required: true },
  inspectionLocation: str(true),
  damageSummary: str(),
  affectedParts: [String],
  partsCost: money,
  labourCost: money,
  taxAmount: money,
  estimatedRepairCost: money,
  notes: str(),
  submittedAt: Date,
  moneyVersion: { type: Number, default: 2 },
});
export const Decision = model("Decision", {
  claim: ref("Claim"),
  decidedBy: ref("User"),
  outcome: { type: String, enum: ["APPROVED", "REJECTED"], required: true },
  reason: str(true),
  policyClause: str(true),
  approvedAmount: money,
  deductible: money,
  payableAmount: money,
  decidedAt: { type: Date, default: Date.now },
  overrideReason: str(),
  moneyVersion: { type: Number, default: 2 },
});
export const Appeal = model("Appeal", {
  claim: ref("Claim"),
  submittedBy: ref("User"),
  reason: str(true),
  supportingInformation: str(),
  status: {
    type: String,
    enum: ["PENDING", "UPHELD", "REOPENED"],
    default: "PENDING",
  },
  reviewedBy: ref("User", false),
  reviewNote: str(),
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
});
export const Notification = model(
  "Notification",
  {
    recipient: ref("User", false),
    recipientRole: String,
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    claim: ref("Claim", false),
    title: str(true),
    message: str(true),
    type: { type: String, default: "INFO" },
    category: { type: String, enum: ["VEHICLE", "CLAIM", "OPERATIONS"], default: "CLAIM" },
    deepLink: String,
    eventType: String,
    dedupeKey: { type: String, unique: true, sparse: true },
    channels: [{ type: String, enum: ["IN_APP", "EMAIL", "SMS"] }],
    delivery: {
      email: { type: String, enum: ["PENDING", "DELIVERED", "FAILED", "SKIPPED"], default: "PENDING" },
      sms: { type: String, enum: ["PENDING", "DELIVERED", "FAILED", "SKIPPED"], default: "PENDING" },
    },
    read: { type: Boolean, default: false },
  },
  [{ recipient: 1, read: 1 }],
);
export const AuditLog = model("AuditLog", {
  claim: ref("Claim", false),
  targetUser: ref("User", false),
  actor: ref("User"),
  actorRole: str(true),
  action: str(true),
  previousValue: str(),
  newValue: str(),
  note: str(),
  timestamp: { type: Date, default: Date.now },
});

export const Estimate = model("Estimate", {
  claim: ref("Claim"), submittedBy: ref("User"),
  supplementary: { type: Boolean, default: false },
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
  lineItems: [{ part: str(true), category: String, cost: money, labour: money, depreciationPercent: Number }],
  total: money, note: str(), reviewedBy: ref("User", false), customerApprovedAt: Date,
});
export const Settlement = model("Settlement", {
  claim: { ...ref("Claim"), unique: true }, calculatedBy: ref("User"),
  gross: money, depreciation: money, policyDeductible: money, voluntaryDeductible: money,
  ncbImpact: money, salvage: money, idvCap: money, netPayable: money, customerShare: money,
  totalLoss: Boolean, lines: [Schema.Types.Mixed], notice: String, overrideReason: String,
});
export const Payment = model("Payment", {
  claim: ref("Claim"), recordedBy: ref("User"), reference: str(true),
  date: { type: Date, required: true }, mode: { type: String, enum: ["BANK_TRANSFER", "CHEQUE", "CASHLESS"] },
  kind: { type: String, enum: ["INTERIM", "FINAL"] }, amount: money,
  status: { type: String, enum: ["RECORDED"], default: "RECORDED" },
}, [{ claim: 1, reference: 1 }]);
export const Grievance = model("Grievance", {
  claim: ref("Claim"), submittedBy: ref("User"), message: str(true), draft: String,
  stage: { type: String, enum: ["INSURER", "BIMA_BHAROSA", "OMBUDSMAN"], default: "INSURER" },
  dueAt: Date, resolution: str(), resolvedAt: Date,
  history: [{ stage: String, at: Date, note: String }],
});
export const RepairUpdate = model("RepairUpdate", {
  claim: ref("Claim"), author: ref("User"), note: str(true),
  documentIds: [{ type: Schema.Types.ObjectId, ref: "ClaimDocument" }], status: String,
});

const storedDocument = {
  originalName: String,
  storedName: String,
  storageProvider: { type: String, default: "local" },
  storageKey: String,
  mimeType: String,
  fileSize: Number,
};

export const ServiceRecord = model("ServiceRecord", {
  vehicle: ref("Vehicle"),
  owner: ref("User"),
  serviceDate: { type: Date, required: true },
  odometer: { type: Number, min: 0, required: true },
  serviceType: str(true),
  workshop: str(true),
  amount: money,
  notes: str(),
  parts: [String],
  documents: [storedDocument],
  nextServiceDue: Date,
}, [{ vehicle: 1, serviceDate: -1 }]);

export const VehicleCheck = model("VehicleCheck", {
  vehicle: ref("Vehicle"),
  owner: ref("User"),
  checkedAt: { type: Date, default: Date.now },
  odometer: { type: Number, min: 0 },
  tyres: { type: String, enum: ["OK", "NEEDS_ATTENTION", "NOT_CHECKED"], default: "NOT_CHECKED" },
  brakes: { type: String, enum: ["OK", "NEEDS_ATTENTION", "NOT_CHECKED"], default: "NOT_CHECKED" },
  lights: { type: String, enum: ["OK", "NEEDS_ATTENTION", "NOT_CHECKED"], default: "NOT_CHECKED" },
  fluids: { type: String, enum: ["OK", "NEEDS_ATTENTION", "NOT_CHECKED"], default: "NOT_CHECKED" },
  exterior: { type: String, enum: ["OK", "NEEDS_ATTENTION", "NOT_CHECKED"], default: "NOT_CHECKED" },
  notes: str(),
}, [{ vehicle: 1, checkedAt: -1 }]);

export const Reminder = model("Reminder", {
  vehicle: ref("Vehicle"),
  owner: ref("User"),
  type: {
    type: String,
    enum: ["SERVICE", "PUC", "INSURANCE_RENEWAL", "DOCUMENT_EXPIRY", "BATTERY_CHECK", "TYRE_CHECK", "CUSTOM"],
    required: true,
  },
  title: str(true),
  dueDate: Date,
  dueOdometer: { type: Number, min: 0 },
  status: { type: String, enum: ["UPCOMING", "DUE", "COMPLETED", "DISMISSED"], default: "UPCOMING" },
}, [{ owner: 1, status: 1, dueDate: 1 }]);

export const VehicleDocument = model("VehicleDocument", {
  vehicle: ref("Vehicle"),
  owner: ref("User"),
  documentType: {
    type: String,
    enum: ["RC", "PUC", "INSURANCE", "SERVICE_INVOICE", "OTHER"],
    required: true,
  },
  title: str(true),
  expiryDate: Date,
  ...storedFileFields(),
}, [{ vehicle: 1, documentType: 1 }, { owner: 1, expiryDate: 1 }]);
