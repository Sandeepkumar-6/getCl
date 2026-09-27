import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, Field } from "../components/UI";
import { api, errorMessage } from "../services/api";
import { PASSWORD_RULES, PasswordInput, PasswordRules } from "./Auth";

export const AccountCard = ({ title, intro, children, footer }) => (
  <div className="gc-public-main gc-public-main--narrow gc-account-page">
    <section className="gc-card gc-account-card" aria-labelledby="account-title">
      <h1 id="account-title">{title}</h1>
      {intro && <p className="gc-body-text">{intro}</p>}
      {children}
      {footer && <p className="gc-note">{footer}</p>}
    </section>
  </div>
);

export function ForgotPassword() {
  const { register, handleSubmit, formState } = useForm();
  const [sent, setSent] = useState("");
  const submit = async (values) => {
    try {
      const response = await api.post("/auth/forgot-password", values);
      setSent(response.data.message);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  return (
    <AccountCard title="Reset your password" intro="Enter the email address of your policyholder account. We’ll send a link to choose a new password." footer={<Link className="gc-link" to="/login">Back to sign in</Link>}>
      {sent && <Alert tone="success" title="Check your email">{sent}</Alert>}
      <form className="gc-form" onSubmit={handleSubmit(submit)}>
        <Field label="Email address"><input type="email" autoComplete="email" required {...register("email")} /></Field>
        <button className="gc-btn gc-btn--block" disabled={formState.isSubmitting} aria-busy={formState.isSubmitting}>
          {formState.isSubmitting ? "Sending link…" : "Send reset link"}
        </button>
      </form>
    </AccountCard>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const [show, setShow] = useState(false);
  const [done, setDone] = useState("");
  const { register, handleSubmit, watch, formState } = useForm();
  const password = watch("password") || "";
  const submit = async (values) => {
    if (!PASSWORD_RULES.every(([, test]) => test(values.password || ""))) return toast.error("Choose a password that meets every rule listed.");
    if (values.password !== values.confirmPassword) return toast.error("The two passwords don’t match. Type the same password twice.");
    try {
      const response = await api.post("/auth/reset-password", { ...values, token: params.get("token") || "" });
      setDone(response.data.message);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  return (
    <AccountCard title="Choose a new password" footer={<Link className="gc-link" to="/login">Back to sign in</Link>}>
      {done ? (
        <Alert tone="success" title="Password changed" action={<Link className="gc-btn gc-btn--sm" to="/login">Sign in</Link>}>{done}</Alert>
      ) : (
        <form className="gc-form" onSubmit={handleSubmit(submit)}>
          <Field label="New password">
            <PasswordInput show={show} onToggle={() => setShow(!show)} autoComplete="new-password" required aria-describedby="reset-rules" {...register("password")} />
          </Field>
          <PasswordRules value={password} id="reset-rules" />
          <Field label="Type the new password again" error={formState.errors.confirmPassword?.message}>
            <input type={show ? "text" : "password"} autoComplete="new-password" required {...register("confirmPassword", { validate: (value) => value === watch("password") || "The two passwords don’t match" })} />
          </Field>
          <button className="gc-btn gc-btn--block" disabled={formState.isSubmitting} aria-busy={formState.isSubmitting}>
            {formState.isSubmitting ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}
    </AccountCard>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState(token ? { tone: "info", text: "Checking your verification link…" } : null);
  const { register, handleSubmit, formState } = useForm();
  const email = params.get("email") || "";
  useEffect(() => {
    if (!token) return;
    api
      .post("/auth/verify-email", { token })
      .then((response) => setStatus({ tone: "success", text: response.data.message }))
      .catch((error) => setStatus({ tone: "error", text: errorMessage(error) }));
  }, [token]);
  const resend = async (values) => {
    try {
      const response = await api.post("/auth/resend-verification", values);
      toast.success(response.data.message);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  return (
    <AccountCard title="Verify your email" intro={token ? undefined : "Verifying your email lets you add and change vehicles, policies and claims. We’ll send a new link to this address."} footer={<Link className="gc-link" to="/portal">Continue to your account</Link>}>
      {status && <Alert tone={status.tone} title={status.tone === "success" ? "Email verified" : status.tone === "error" ? "This link didn’t work" : undefined}>{status.text}</Alert>}
      <form className="gc-form" onSubmit={handleSubmit(resend)}>
        <Field label="Email address"><input type="email" autoComplete="email" defaultValue={email} required {...register("email")} /></Field>
        <button className="gc-btn gc-btn--secondary gc-btn--block" disabled={formState.isSubmitting} aria-busy={formState.isSubmitting}>
          {formState.isSubmitting ? "Sending…" : "Send a new verification link"}
        </button>
      </form>
    </AccountCard>
  );
}
