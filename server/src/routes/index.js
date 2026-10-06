import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as V from "../middleware/validate.js";
import * as A from "../controllers/auth.js";
import * as C from "../controllers/claims.js";
import * as VP from "../controllers/vehicles.js";
import * as S from "../controllers/staff.js";
import * as N from "../controllers/notifications.js";
import * as Admin from "../controllers/admin.js";
import * as W from "../controllers/workflow.js";
import * as VC from "../controllers/vehicleCare.js";
import { auth, roles, verifiedPolicyholder } from "../middleware/auth.js";
import { upload } from "../middleware/uploads.js";

export const router = Router();
const publicAuthLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 });

router.post("/auth/register", publicAuthLimit, V.validate(V.registration), A.register);
router.post("/auth/login", publicAuthLimit, V.validate(V.login), A.login);
router.post("/auth/complete-mfa", rateLimit({ windowMs: 15 * 60 * 1000, limit: 15 }), V.validate(V.completeMfa), A.completeMfa);
router.post(
  "/auth/forgot-password",
  publicAuthLimit,
  V.validate(V.emailOnly),
  A.forgotPassword,
);
router.post(
  "/auth/reset-password",
  publicAuthLimit,
  V.validate(V.resetPassword),
  A.resetPassword,
);
router.post(
  "/auth/verify-email",
  publicAuthLimit,
  V.validate(V.tokenOnly),
  A.verifyEmail,
);
router.post(
  "/auth/resend-verification",
  publicAuthLimit,
  V.validate(V.emailOnly),
  A.resendVerification,
);
router.post(
  "/auth/surveyor-apply",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }),
  upload.single("verificationDocument"),
  V.validate(V.surveyorApplication),
  A.applySurveyor,
);

router.use(auth);
router.post("/auth/logout", A.logout);
router.get("/auth/me", A.me);
router.post("/auth/change-password", V.validate(V.changePassword), A.changePassword);
router.patch("/auth/me", V.validate(V.profile), A.updateProfile);

router.get("/staff/surveyor-applications", roles("ADMIN", "SUPER_ADMIN"), S.listSurveyors);
router.get("/staff/:id/document", roles("ADMIN", "SUPER_ADMIN"), S.staffDocument);
router.patch(
  "/staff/surveyors/:id/review",
  roles("ADMIN", "SUPER_ADMIN"),
  V.validate(V.surveyorReview),
  S.reviewSurveyor,
);
router.get("/staff", roles("SUPER_ADMIN"), S.listStaff);
router.post("/staff/admins", roles("SUPER_ADMIN"), V.validate(V.createAdmin), S.createAdmin);
router.patch(
  "/staff/:id/status",
  roles("ADMIN", "SUPER_ADMIN"),
  V.validate(V.staffStatus),
  S.changeStaffStatus,
);
router.post("/staff/:id/reset-password", roles("SUPER_ADMIN"), S.resetStaffPassword);
router.get("/staff/:id/audit", roles("SUPER_ADMIN"), S.staffAudit);

router.get("/vehicles", roles("POLICYHOLDER", "ADMIN", "SUPER_ADMIN"), VP.listVehicles);
router.post(
  "/vehicles",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  V.validate(V.vehicle),
  VP.createVehicle,
);
router.get("/vehicles/:id", roles("POLICYHOLDER", "ADMIN", "SUPER_ADMIN"), VP.getVehicle);
router.patch("/vehicles/:id/primary", roles("POLICYHOLDER"), verifiedPolicyholder, VP.setPrimaryVehicle);
router.get("/vehicles/:id/photo", VP.getVehiclePhoto);
router.patch("/vehicles/:id/appearance", roles("POLICYHOLDER"), verifiedPolicyholder, V.validate(V.vehicleAppearance), VP.updateVehicleAppearance);
router.post("/vehicles/:id/photo", roles("POLICYHOLDER"), verifiedPolicyholder, upload.single("file"), VP.uploadVehiclePhoto);
router.get("/vehicles/:id/care", roles("POLICYHOLDER", "ADMIN", "SUPER_ADMIN"), VC.overview);
router.patch("/vehicles/:id/odometer", roles("POLICYHOLDER"), verifiedPolicyholder, V.validate(V.odometer), VP.updateOdometer);
router.post("/vehicles/:id/services", roles("POLICYHOLDER"), verifiedPolicyholder, V.validate(V.serviceRecord), VC.addService);
router.post("/vehicles/:id/services/:serviceId/documents", roles("POLICYHOLDER"), verifiedPolicyholder, upload.single("file"), VC.addServiceDocument);
router.get("/vehicles/:id/services/:serviceId/documents/:documentId", roles("POLICYHOLDER", "ADMIN", "SUPER_ADMIN"), VC.downloadServiceDocument);
router.post("/vehicles/:id/checks", roles("POLICYHOLDER"), verifiedPolicyholder, V.validate(V.vehicleCheck), VC.addCheck);
router.post("/vehicles/:id/reminders", roles("POLICYHOLDER"), verifiedPolicyholder, V.validate(V.reminder), VC.addReminder);
router.patch("/vehicles/:id/reminders/:reminderId", roles("POLICYHOLDER"), verifiedPolicyholder, V.validate(V.reminderStatus), VC.updateReminder);
router.post("/vehicles/:id/documents", roles("POLICYHOLDER"), verifiedPolicyholder, upload.single("file"), V.validate(V.vehicleDocument), VC.addVehicleDocument);
router.get("/vehicles/:id/documents/:documentId", roles("POLICYHOLDER", "ADMIN", "SUPER_ADMIN"), VC.downloadVehicleDocument);
router.delete("/vehicles/:id/documents/:documentId", roles("POLICYHOLDER"), verifiedPolicyholder, VC.deleteVehicleDocument);
router.patch("/vehicles/:id/verification", roles("ADMIN", "SUPER_ADMIN"), V.validate(V.verification), VP.verifyVehicle);
router.patch(
  "/vehicles/:id",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  V.validate(V.vehicle),
  VP.updateVehicle,
);
router.delete(
  "/vehicles/:id",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  VP.deleteVehicle,
);
router.get("/policies", roles("POLICYHOLDER", "ADMIN", "SUPER_ADMIN"), VP.listPolicies);
router.post(
  "/policies",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  V.validate(V.policy),
  VP.createPolicy,
);
router.get("/policies/:id", roles("POLICYHOLDER", "ADMIN", "SUPER_ADMIN"), VP.getPolicy);
router.patch("/policies/:id/verification", roles("ADMIN", "SUPER_ADMIN"), V.validate(V.verification), VP.verifyPolicy);
router.patch(
  "/policies/:id",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  V.validate(V.policy),
  VP.updatePolicy,
);
router.delete(
  "/policies/:id",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  VP.deletePolicy,
);
router.post(
  "/policies/:id/document",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  upload.single("file"),
  VP.uploadPolicyDocument,
);
router.get(
  "/policies/:id/document",
  roles("POLICYHOLDER", "ADMIN", "SUPER_ADMIN"),
  VP.downloadPolicyDocument,
);

router.get("/claims", C.list);
router.get("/claims/stats", C.stats);
router.get("/garages", W.listGarages);
router.post("/calculator", roles("POLICYHOLDER"), V.validate(V.calculator), W.calculator);
router.post(
  "/claims",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  V.validate(V.draft),
  C.create,
);
router.get("/claims/:id", C.detail);
router.patch(
  "/claims/:id/draft",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  V.validate(V.draft),
  C.saveDraft,
);
router.patch(
  "/claims/:id/submit",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  C.submit,
);
router.patch(
  "/claims/:id/status",
  roles("ADMIN", "SUPER_ADMIN"),
  V.validate(V.transition),
  C.transition,
);
router.patch(
  "/claims/:id/respond",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  V.validate(V.response),
  C.respond,
);
router.patch(
  "/claims/:id/assign",
  roles("ADMIN", "SUPER_ADMIN"),
  V.validate(V.assignment),
  C.assign,
);
router.get("/claims/:id/documents", C.listDocuments);
router.post(
  "/claims/:id/documents",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  C.prepareDocumentUpload,
  upload.single("file"),
  C.uploadDocument,
);
router.get("/claims/:id/documents/:documentId/download", C.downloadDocument);
router.delete(
  "/claims/:id/documents/:documentId",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  C.deleteDocument,
);
router.patch(
  "/claims/:id/documents/:documentId/verify",
  roles("ADMIN", "SURVEYOR"),
  V.validate(V.documentVerification),
  C.verifyDocument,
);
router.post(
  "/claims/:id/inspection/schedule",
  roles("SURVEYOR"),
  V.validate(V.schedule),
  C.scheduleInspection,
);
router.post(
  "/claims/:id/inspection",
  roles("SURVEYOR"),
  V.validate(V.report),
  C.submitInspection,
);
router.get("/claims/:id/inspection", C.getInspection);
router.get("/claims/:id/settlement-preview", W.preview);
router.post(
  "/claims/:id/estimates",
  roles("POLICYHOLDER", "SURVEYOR", "ADMIN"),
  V.validate(V.estimate),
  W.addEstimate,
);
router.patch(
  "/claims/:id/estimates/:estimateId",
  roles("POLICYHOLDER", "ADMIN"),
  V.validate(V.estimateReview),
  W.reviewEstimate,
);
router.post(
  "/claims/:id/decision",
  roles("ADMIN", "SUPER_ADMIN"),
  V.validate(V.decision),
  C.decide,
);
router.post(
  "/claims/:id/payments",
  roles("ADMIN"),
  V.validate(V.payment),
  W.recordPayment,
);
router.post(
  "/claims/:id/repair-updates",
  roles("POLICYHOLDER", "SURVEYOR", "ADMIN"),
  V.validate(V.repairUpdate),
  W.repair,
);
router.get("/claims/:id/grievance-draft", roles("POLICYHOLDER"), W.grievanceDraft);
router.post(
  "/claims/:id/grievances",
  roles("POLICYHOLDER"),
  V.validate(V.grievance),
  W.addGrievance,
);
router.patch(
  "/claims/:id/grievances/:grievanceId",
  roles("POLICYHOLDER", "ADMIN"),
  V.validate(V.grievanceUpdate),
  W.updateGrievance,
);
router.post(
  "/claims/:id/appeal",
  roles("POLICYHOLDER"),
  verifiedPolicyholder,
  V.validate(V.reason),
  C.appeal,
);
router.patch(
  "/claims/:id/appeal",
  roles("ADMIN"),
  V.validate(V.appealReview),
  C.reviewAppeal,
);

router.get("/notifications", N.list);
router.patch("/notifications/read-all", N.readAll);
router.patch("/notifications/:id/read", N.readOne);
router.get("/admin/users", roles("ADMIN", "SUPER_ADMIN"), Admin.listUsers);
router.patch(
  "/admin/users/:id/status",
  roles("ADMIN", "SUPER_ADMIN"),
  V.validate(V.userStatus),
  Admin.changeUserStatus,
);
router.get("/admin/audit-logs", roles("ADMIN", "SUPER_ADMIN"), Admin.auditLogs);
router.get("/admin/surveyors", roles("ADMIN", "SUPER_ADMIN"), Admin.activeSurveyors);
