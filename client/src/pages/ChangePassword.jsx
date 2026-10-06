import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Facts, Field, Logo, PageHeader } from "../components/UI";
import { date } from "../utils/format";
import { PASSWORD_RULES, PasswordInput, PasswordRules } from "./Auth";

// Forced change after a temporary password (standalone), or a voluntary change from the account menu.
export default function ChangePassword() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const forced = Boolean(user.mustChangePassword);
  const [show, setShow] = useState(false);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const next = watch("newPassword") || "";
  const submit = async (data) => {
    if (!PASSWORD_RULES.every(([, test]) => test(data.newPassword || ""))) return toast.error("Choose a password that meets every rule listed.");
    if (data.newPassword !== data.confirmPassword) return toast.error("The two new passwords don’t match. Type the same password twice.");
    try {
      const r = await api.post("/auth/change-password", data);
      setUser(r.data.user);
      toast.success("Password changed.");
      navigate(forced ? "/portal" : "/portal/profile");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const form = (
    <form className="gc-form" onSubmit={handleSubmit(submit)}>
      <Field label={forced ? "Temporary password" : "Current password"} error={errors.currentPassword?.message}>
        <input type="password" autoComplete="current-password" {...register("currentPassword", { required: forced ? "Enter the temporary password you were given" : "Enter your current password" })} />
      </Field>
      <Field label="New password">
        <PasswordInput show={show} onToggle={() => setShow(!show)} autoComplete="new-password" aria-describedby="change-rules" {...register("newPassword", { required: true })} />
      </Field>
      <PasswordRules value={next} id="change-rules" />
      <Field label="Type the new password again" error={errors.confirmPassword?.message}>
        <input type={show ? "text" : "password"} autoComplete="new-password" {...register("confirmPassword", { required: "Type the new password again", validate: (v) => v === watch("newPassword") || "The two new passwords don’t match" })} />
      </Field>
      <div className="gc-form-actions">
        <button className="gc-btn" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? "Saving…" : "Save new password"}</button>
        {!forced && <Link className="gc-btn gc-btn--secondary" to="/portal/profile">Cancel</Link>}
      </div>
    </form>
  );
  if (!forced)
    return (
      <>
        <PageHeader title="Change password" description="You’ll stay signed in on this device. Other devices are signed out." />
        <div className="gc-grid-2 gc-grid-profile gc-grid-2--top">
          <section className="gc-card" aria-label="New password">{form}</section>
          <aside className="gc-card" aria-labelledby="pw-about">
            <div className="gc-card-head"><h2 id="pw-about">About your password</h2></div>
            <Facts columns={1} items={[["Last changed", user.passwordChangedAt ? date(user.passwordChangedAt) : "Not changed since you joined"]]} />
            <ul className="gc-plain-list gc-about-list">
              <li>You stay signed in on this device. Other devices are signed out and need the new password.</li>
              <li>Five wrong attempts lock the account for 15 minutes.</li>
              <li>Forgotten your current password? Sign out and choose “Forgot password” on the sign-in page.</li>
            </ul>
          </aside>
        </div>
      </>
    );
  return (
    <div className="gc-public">
      <header className="gc-public-head"><div className="gc-public-bar"><Logo /></div></header>
      <main id="main" className="gc-public-main gc-public-main--narrow">
        <section className="gc-card gc-account-card" aria-labelledby="pw-title">
          <h1 id="pw-title">Choose your own password</h1>
          <p className="gc-body-text">You signed in with a temporary password. Replace it to open your account.</p>
          {form}
          <p className="gc-note">Not you? <button type="button" className="gc-text-button" onClick={() => { logout(); navigate("/login"); }}>Sign out</button></p>
        </section>
      </main>
    </div>
  );
}
