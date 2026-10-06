import { z } from "zod";
export const validate = (schema) => (req, res, next) => {
  req.body = schema.parse(req.body);
  next();
};
const text = z.string().trim().max(5000);
const money = z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const phone = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");
const email = z.string().email().toLowerCase();
const staffId = text.min(3).max(50).transform((value) => value.toUpperCase());
const strongPassword = z.string()
  .min(10, "Use at least 10 characters")
  .max(72)
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/\d/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a special character");
export const profile = z.object({
  name: text.min(2),
  phone,
  address: text.optional(),
  city: text.optional(),
  state: text.optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/)
    .or(z.literal(""))
    .optional(),
});
export const registration = profile.extend({
  email,
  password: strongPassword,
});
export const login = z.object({
  email,
  password: z.string().min(1).max(72),
});
export const completeMfa = z.object({
  challengeId: z.string().regex(/^[a-f0-9]{64}$/),
  code: z.string().regex(/^\d{8}$/, "Enter the 8-digit security code"),
});
export const emailOnly = z.object({ email });
export const tokenOnly = z.object({ token: z.string().min(40).max(200) });
export const surveyorApplication = z
  .object({
    name: text.min(2),
    email,
    phone,
    password: strongPassword,
    confirmPassword: z.string(),
    surveyorId: staffId,
    qualification: text.min(2),
    experience: z.coerce.number().int().min(0).max(70),
    surveyorRegion: text.min(2),
    address: text.min(5),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export const createAdmin = z.object({
  name: text.min(2),
  email,
  phone,
  employeeId: staffId,
  temporaryPassword: strongPassword,
});
export const changePassword = z
  .object({
    currentPassword: z.string().min(1).max(72),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export const resetPassword = z
  .object({
    token: z.string().min(40).max(200),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export const surveyorReview = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: text.optional(),
  })
  .refine((v) => v.decision !== "REJECT" || (v.reason?.length || 0) >= 10, {
    message: "Give a rejection reason of at least 10 characters",
    path: ["reason"],
  });
export const staffStatus = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});
export const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Choose a valid record");
export const vehicle = z.object({
  registrationNumber: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine(
      (v) =>
        /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/.test(v) ||
        /^[A-Z]{2}\d{1,2}[A-Z]\d{1,4}[A-Z]$/.test(v),
      "Enter a valid Indian registration number",
    ),
  manufacturer: text.min(1),
  model: text.min(1),
  variant: text.optional(),
  color: z.string().trim().max(80).optional(),
  paintCode: z.string().trim().max(40).optional(),
  manufacturingYear: z.coerce
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 1),
  chassisNumber: text.min(5),
  engineNumber: text.min(3),
  vehicleType: text.min(1),
  fuelType: text.min(1),
  currentOdometer: z.coerce.number().int().min(0).optional(),
  serviceIntervalKm: z.coerce.number().int().min(1000).max(100000).optional(),
  serviceIntervalMonths: z.coerce.number().int().min(1).max(60).optional(),
  nextServiceDueAt: z.string().refine((v) => !v || !isNaN(Date.parse(v)), "Enter a valid date").optional(),
});
export const vehicleAppearance = z.object({
  color: z.string().trim().min(1).max(80),
  paintCode: z.string().trim().max(40).optional(),
});
const date = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), "Enter a valid date");
export const policy = z
  .object({
    vehicle: objectId,
    policyNumber: text.min(3).transform((v) => v.toUpperCase()),
    insurer: text.min(2),
    coverageType: z.enum(["Comprehensive", "Third-party", "Own damage"]),
    claimTypes: z
      .array(z.enum(["Cashless", "Reimbursement"]))
      .min(1)
      .default(["Cashless", "Reimbursement"]),
    startDate: date,
    expiryDate: date,
    insuredDeclaredValue: money,
    deductible: money,
    voluntaryDeductible: money.optional(),
    zeroDepreciation: z.boolean().optional(),
    ncbPercent: z.coerce.number().min(0).max(100).optional(),
    ownDamagePremium: money.optional(),
    cashlessGarageAvailable: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => new Date(v.expiryDate) >= new Date(v.startDate), {
    message: "Expiry date cannot be earlier than the start date",
    path: ["expiryDate"],
  });
export const draft = z.object({
  claimType: z.enum(["OWN_DAMAGE", "THIRD_PARTY", "THEFT", "TOTAL_LOSS"]).optional(),
  estimatedLoss: money.optional(),
  garageId: text.max(100).optional(),
  vehicle: z.string().regex(/^[a-f\d]{24}$/i),
  policy: z.string().regex(/^[a-f\d]{24}$/i),
  accident: z
    .object({
      date: date
        .refine(
          (v) => new Date(v) <= new Date(),
          "Accident date cannot be in the future",
        )
        .optional()
        .or(z.literal("")),
      time: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional()
        .or(z.literal("")),
      type: text.optional(),
      claimType: z.enum(["Cashless", "Reimbursement"]).optional(),
      location: text.optional(),
      landmark: text.optional(),
      description: text.optional(),
      weather: text.optional(),
      road: text.optional(),
      driveable: z.boolean().optional(),
      injury: z.boolean().optional(),
      thirdParty: z.boolean().optional(),
    })
    .optional(),
  police: z
    .object({
      number: text.optional(),
      station: text.optional(),
      date: date.optional().or(z.literal("")),
    })
    .optional(),
  thirdParty: z
    .object({
      name: text.optional(),
      registration: text.optional(),
      phone: z
        .string()
        .regex(/^[6-9]\d{9}$/)
        .optional()
        .or(z.literal("")),
      injuryDescription: text.optional(),
    })
    .optional(),
  declarationAccepted: z.boolean().optional(),
});
export const schedule = z.object({
  scheduledDate: date.refine(
    (v) => new Date(v) > new Date(),
    "Choose a future inspection time",
  ),
  inspectionLocation: text.min(3),
});
export const report = z.object({
  damageSummary: text.min(20),
  affectedParts: z.array(text.min(1)).min(1),
  partsCost: money,
  labourCost: money,
  taxAmount: money,
  notes: text.min(10),
});
export const decision = z.object({
  outcome: z.enum(["APPROVED", "REJECTED"]),
  reason: text.min(10),
  policyClause: text.min(3),
  overrideAmount: money.optional(),
  overrideReason: text.min(10).optional(),
  salvage: money.optional(),
  liabilityAward: money.optional(),
});
export const reason = z.object({
  reason: text.min(10),
  supportingInformation: text.optional(),
});
export const response = z.object({ response: text.min(10) });
export const transition = z.object({
  status: z.enum(["UNDER_REVIEW", "MORE_INFORMATION_REQUIRED", "SETTLED", "TOTAL_LOSS", "REPAIR_IN_PROGRESS", "READY_FOR_DELIVERY"]),
  note: text.min(10),
});
export const assignment = z.object({ surveyor: objectId });
export const documentVerification = z.object({
  verificationStatus: z.enum(["ACCEPTED", "REJECTED"]),
  rejectionReason: z.string().max(1000).optional(),
});
export const appealReview = z.object({
  status: z.enum(["UPHELD", "REOPENED"]),
  reviewNote: text.min(10),
});
export const userStatus = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]).optional(), active: z.boolean().optional() }).refine(v => v.status || v.active !== undefined, "Choose a status");
export const estimate = z.object({
  supplementary: z.boolean().default(false),
  lineItems: z.array(z.object({ part: text.min(2), category: z.enum(["OTHER", "PLASTIC", "GLASS", "FIBRE_GLASS", "PAINTING", "PAINT", "RUBBER", "BATTERY", "TYRE"]), cost: money, labour: money })).min(1).max(100),
});
export const estimateReview = z.object({ status: z.enum(["APPROVED", "REJECTED"]), note: text.min(5) });
export const payment = z.object({ reference: text.min(3).max(100), mode: z.enum(["BANK_TRANSFER", "CHEQUE", "CASHLESS"]), date, kind: z.enum(["INTERIM", "FINAL"]) });
export const repairUpdate = z.object({ note: text.min(10), documentIds: z.array(objectId).max(20).default([]), status: z.enum(["REPAIR_IN_PROGRESS", "READY_FOR_DELIVERY"]).optional() });
export const grievance = z.object({ message: text.min(10) });
export const grievanceUpdate = z.object({ stage: z.enum(["BIMA_BHAROSA", "OMBUDSMAN"]).optional(), resolution: text.min(10).optional() }).refine(v => v.stage || v.resolution, "Choose an action");
export const calculator = z.object({ policyId: objectId, estimatedCost: money });
export const verification = z.object({
  verificationStatus: z.enum(["PENDING_VERIFICATION", "VERIFIED", "REJECTED"]),
  verificationReason: text.optional(),
}).refine(v => v.verificationStatus !== "REJECTED" || (v.verificationReason?.length || 0) >= 5, {
  message: "Give a rejection reason of at least 5 characters",
  path: ["verificationReason"],
});
export const serviceRecord = z.object({
  serviceDate: date,
  odometer: z.coerce.number().int().min(0),
  serviceType: text.min(2),
  workshop: text.min(2),
  amount: money.default(0),
  notes: text.optional(),
  parts: z.array(text.min(1)).max(100).default([]),
  nextServiceDue: date.optional().or(z.literal("")),
});
const checkState = z.enum(["OK", "NEEDS_ATTENTION", "NOT_CHECKED"]);
export const vehicleCheck = z.object({
  checkedAt: date.optional(),
  odometer: z.coerce.number().int().min(0).optional(),
  tyres: checkState.default("NOT_CHECKED"), brakes: checkState.default("NOT_CHECKED"),
  lights: checkState.default("NOT_CHECKED"), fluids: checkState.default("NOT_CHECKED"),
  exterior: checkState.default("NOT_CHECKED"), notes: text.optional(),
});
export const reminder = z.object({
  type: z.enum(["SERVICE", "PUC", "INSURANCE_RENEWAL", "DOCUMENT_EXPIRY", "BATTERY_CHECK", "TYRE_CHECK", "CUSTOM"]),
  title: text.min(2),
  dueDate: date.optional().or(z.literal("")),
  dueOdometer: z.coerce.number().int().min(0).optional(),
}).refine(v => v.dueDate || v.dueOdometer !== undefined, "Choose a due date or odometer");
export const reminderStatus = z.object({ status: z.enum(["UPCOMING", "DUE", "COMPLETED", "DISMISSED"]) });
export const odometer = z.object({ currentOdometer: z.coerce.number().int().min(0) });
export const vehicleDocument = z.object({
  documentType: z.enum(["RC", "PUC", "INSURANCE", "SERVICE_INVOICE", "OTHER"]),
  title: text.min(2),
  expiryDate: date.optional().or(z.literal("")),
});
