import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Loading } from "./components/UI";
import PublicLayout from "./layouts/PublicLayout";
import PortalLayout from "./layouts/PortalLayout";
import { InfoPage, FAQ, Contact, NotFound } from "./pages/Public";
const Home = lazy(() => import("./pages/HomeLanding"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
import Auth from "./pages/Auth";
const SurveyorApply = lazy(() => import("./pages/SurveyorApply"));
import ChangePassword from "./pages/ChangePassword";
import {
  ForgotPassword,
  ResetPassword,
  VerifyEmail,
} from "./pages/AccountRecovery";
const StaffApprovals = lazy(() => import("./pages/Staff").then((m) => ({ default: m.StaffApprovals })));
const StaffManagement = lazy(() => import("./pages/Staff").then((m) => ({ default: m.StaffManagement })));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Claims = lazy(() => import("./pages/Claims"));
const ClaimDetail = lazy(() => import("./pages/ClaimDetail"));
const NewClaim = lazy(() => import("./pages/NewClaim"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const VehicleCare = lazy(() => import("./pages/VehicleCare"));
const PrimaryVehiclePage = lazy(() => import("./pages/VehicleWorkspacePages").then(m => ({ default: m.PrimaryVehiclePage })));
const PolicyOverviewPage = lazy(() => import("./pages/VehicleWorkspacePages").then(m => ({ default: m.PolicyOverviewPage })));
const VehicleDocumentsPage = lazy(() => import("./pages/VehicleWorkspacePages").then(m => ({ default: m.VehicleDocumentsPage })));
const VehicleRemindersPage = lazy(() => import("./pages/VehicleWorkspacePages").then(m => ({ default: m.VehicleRemindersPage })));
const ClaimHelp = lazy(() => import("./pages/ClaimHelp"));
const account = () => import("./pages/Account");
const Notifications = lazy(() => account().then((m) => ({ default: m.Notifications })));
const Profile = lazy(() => account().then((m) => ({ default: m.Profile })));
const Users = lazy(() => account().then((m) => ({ default: m.Users })));
const Audit = lazy(() => account().then((m) => ({ default: m.Audit })));
const ClaimResources = lazy(() => account().then((m) => ({ default: m.ClaimResources })));

function Protected({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Opening your account…" />;
  // Remember where the person was going so sign-in can return them there.
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (user.mustChangePassword && location.pathname !== "/change-password")
    return <Navigate to="/change-password" replace />;
  if (roles && !roles.includes(user.role))
    return <Navigate to="/access-denied" replace />;
  return <Outlet />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<Loading />}><Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        {[
          "how-it-works",
          "services",
          "claim-eligibility",
          "required-documents",
          "about",
        ].map((page) => (
          <Route key={page} path={page} element={<InfoPage page={page} />} />
        ))}
        <Route path="faq" element={<FAQ />} />
        <Route path="contact" element={<Contact />} />
        <Route path="privacy-policy" element={<PrivacyPolicy />} />
        <Route path="login" element={<Auth key="login" />} />
        <Route path="register" element={<Auth key="register" register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="surveyor-apply" element={<SurveyorApply />} />
        <Route path="access-denied" element={<NotFound denied />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route element={<Protected />}>
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="portal" element={<PortalLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="claims" element={<Claims />} />
          <Route path="password" element={<ChangePassword />} />
          <Route element={<Protected roles={["POLICYHOLDER"]} />}>
            <Route path="claims/new" element={<NewClaim />} />
            <Route path="claims/:id/edit" element={<NewClaim />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="vehicles/:id" element={<VehicleCare />} />
            <Route path="vehicle" element={<PrimaryVehiclePage />} />
            <Route path="insurance" element={<PolicyOverviewPage />} />
            <Route path="reminders" element={<VehicleRemindersPage />} />
            <Route path="payments" element={<ClaimResources payments />} />
            <Route path="activity" element={<Notifications />} />
            <Route path="support" element={<ClaimHelp />} />
            <Route path="claim-help" element={<ClaimHelp />} />
          </Route>
          <Route path="claims/:id" element={<ClaimDetail />} />
          <Route path="claims/:id/timeline" element={<ClaimDetail initialTab="history" />} />
          <Route path="documents" element={user?.role === "POLICYHOLDER" ? <VehicleDocumentsPage /> : <ClaimResources />} />
          <Route path="inspections" element={<ClaimResources inspections />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route element={<Protected roles={["ADMIN", "SUPER_ADMIN"]} />}>
            <Route path="users" element={<Users />} />
            <Route path="staff-approvals" element={<StaffApprovals />} />
            <Route path="audit" element={<Audit />} />
          </Route>
          <Route element={<Protected roles={["SUPER_ADMIN"]} />}>
            <Route path="staff" element={<StaffManagement />} />
          </Route>
        </Route>
      </Route>
    </Routes></Suspense>
  );
}
