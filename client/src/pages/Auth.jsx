import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Check, Circle, ClipboardCheck, Clock3, Eye, EyeOff, FolderLock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../services/api";
import { Field, Logo, cx } from "../components/UI";
import { assets } from "../assets/manifest";

// The server's registration rules (server/src/middleware/validate.js).
export const PASSWORD_RULES = [
  ["10 or more characters", (v) => v.length >= 10],
  ["An upper-case letter", (v) => /[A-Z]/.test(v)],
  ["A lower-case letter", (v) => /[a-z]/.test(v)],
  ["A number", (v) => /\d/.test(v)],
  ["A symbol, such as @ or #", (v) => /[^A-Za-z0-9]/.test(v)],
];
export const strongPassword = z
  .string()
  .max(72, "Use 72 characters or fewer")
  .refine((v) => PASSWORD_RULES.every(([, test]) => test(v)), "Meet every password rule listed below the field");

export function PasswordRules({ value = "", id }) {
  return (
    <ul className="gc-rules" id={id} aria-label="Password rules">
      {PASSWORD_RULES.map(([text, test]) => {
        const met = test(value);
        return (
          <li key={text} className={met ? "is-met" : undefined}>
            {met ? <Check className="gc-icon gc-icon--sm" aria-hidden="true" /> : <Circle className="gc-icon gc-icon--sm" aria-hidden="true" />}
            {text}<span className="gc-sr">{met ? " (done)" : " (not yet)"}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function PasswordInput({ show, onToggle, ...props }) {
  return (
    <div className="gc-password">
      <input type={show ? "text" : "password"} {...props} />
      <button type="button" className="gc-btn gc-btn--quiet gc-btn--icon" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={onToggle}>
        {show ? <EyeOff className="gc-icon" aria-hidden="true" /> : <Eye className="gc-icon" aria-hidden="true" />}
      </button>
    </div>
  );
}

// The same three points on both screens; the icons only mark them.
const POINTS = [[ClipboardCheck, "File a claim and save it to finish later"], [Clock3, "See what happens next, who does it and by when"], [FolderLock, "Keep policy, service and claim documents together"]];
const DEMO = [["Policyholder", "customer", "Customer"], ["Surveyor", "surveyor", "Surveyor"], ["Admin", "admin", "Admin"], ["Super admin", "superadmin", "SuperAdmin"]];
const PUBLIC_DEMO = import.meta.env.VITE_PUBLIC_DEMO === "true";
const demoUsername = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{2,29}$/, "Use 3–30 letters, numbers, underscores or hyphens");

export default function Auth({ register: signup = false }) {
  const [showPassword, setShowPassword] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticate } = useAuth();
  const from = location.state?.from;
  const schema = z.object({
    email: PUBLIC_DEMO ? (signup ? demoUsername : demoUsername.or(z.string().email())) : z.string().email("Enter an email address like name@example.in"),
    password: signup ? strongPassword : z.string().min(1, "Enter your password").max(72),
    ...(signup
      ? {
          name: z.string().trim().min(2, "Enter your full name"),
          phone: PUBLIC_DEMO ? z.string().default("9999999999") : z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number starting with 6, 7, 8 or 9"),
        }
      : {}),
  });
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  const password = watch("password") || "";
  const submit = async (data) => {
    try {
      const account = await authenticate(signup ? "register" : "login", {
        ...data,
        email: PUBLIC_DEMO && !data.email.includes("@") ? `${data.email}@demo.getclaim.invalid` : data.email,
      });
      if (account.mfaRequired) {
        setChallenge(account.challengeId);
        return;
      }
      toast.success(signup ? (PUBLIC_DEMO ? "Demo account created. You can sign in with this username." : "Account created. Check your email for the verification link.") : `Signed in as ${account.name}.`);
      navigate(account.mustChangePassword ? "/change-password" : from && from.startsWith("/portal") ? from : "/portal", { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const completeMfa = async (event) => {
    event.preventDefault();
    setCheckingCode(true);
    try {
      const account = await authenticate("complete-mfa", { challengeId: challenge, code });
      toast.success(`Signed in as ${account.name}.`);
      navigate(account.mustChangePassword ? "/change-password" : from && from.startsWith("/portal") ? from : "/portal", { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally { setCheckingCode(false); }
  };
  return (
    <div className={cx("gc-auth", signup && "gc-auth--register")}>
      <aside className="gc-auth-visual">
        <img className="gc-auth-photo" src={signup ? assets.hero.authRegister : assets.hero.authSignIn} alt="" />
        <div className="gc-auth-visual-inner">
          <Logo inverse />
          <div className="gc-auth-intro">
            <p className="gc-auth-headline">{signup ? "One account for your vehicles, policies and claims." : "Pick up where you left off."}</p>
            <ul className="gc-auth-points">
              {POINTS.map(([Icon, text]) => (
                <li key={text}><span className="gc-auth-point-icon" aria-hidden="true"><Icon className="gc-icon gc-icon--sm" /></span>{text}</li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
      <main id="main" className="gc-auth-main">
        <div className="gc-auth-column">
          <div className="gc-auth-top">
            <Link className="gc-auth-back" to="/"><ArrowLeft className="gc-icon gc-icon--sm" aria-hidden="true" />Back to home</Link>
          </div>
          <section className="gc-auth-card" aria-labelledby="auth-title">
            <header className="gc-auth-card-head">
              <h1 id="auth-title">{challenge ? "Check your email" : signup ? "Create your account" : "Sign in"}</h1>
              {challenge ? <p className="gc-note">Enter the 8-digit security code we sent to your email. It expires in 5 minutes.</p> : null}
              {!challenge && <>
              <p className="gc-auth-switch">
                {signup ? <>Already have an account? <Link className="gc-link" to="/login" state={location.state}>Sign in</Link></> : <>New to getClaim? <Link className="gc-link" to="/register" state={location.state}>Create an account</Link></>}
              </p>
              {from && !signup && <p className="gc-note">Sign in to continue to the page you asked for.</p>}
              </>}
            </header>
            {challenge ? (
              <form className="gc-form gc-auth-form" onSubmit={completeMfa}>
                <Field label="Security code"><input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} required /></Field>
                <button className="gc-btn gc-btn--lg gc-btn--block" type="submit" disabled={checkingCode || code.length !== 8}>{checkingCode ? "Checking…" : "Continue securely"}</button>
                <button className="gc-text-button" type="button" onClick={() => { setChallenge(null); setCode(""); }}>Back to sign in</button>
              </form>
            ) : (
            <form className="gc-form gc-auth-form" onSubmit={handleSubmit(submit)} noValidate>
              {signup && <Field label="Full name" error={errors.name?.message}><input autoComplete="name" {...register("name")} /></Field>}
              {PUBLIC_DEMO && <p className="gc-note">College demo: choose a username and use fictional details. Your account and changes are saved. Email recovery and uploads are unavailable.</p>}
              <Field label={PUBLIC_DEMO ? "Demo username" : "Email address"} error={errors.email?.message}><input type={PUBLIC_DEMO ? "text" : "email"} autoComplete={PUBLIC_DEMO ? "username" : "email"} inputMode={PUBLIC_DEMO ? "text" : "email"} placeholder={PUBLIC_DEMO ? "your_demo_name" : "name@example.in"} {...register("email")} /></Field>
              {signup && !PUBLIC_DEMO && <Field label="Mobile number" hint="We send claim updates to this number" error={errors.phone?.message}><input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98765 43210" {...register("phone")} /></Field>}
              <Field label="Password" error={errors.password?.message}>
                <PasswordInput show={showPassword} onToggle={() => setShowPassword(!showPassword)} autoComplete={signup ? "new-password" : "current-password"} aria-describedby={signup ? "password-rules" : undefined} {...register("password")} />
              </Field>
              {signup && <PasswordRules value={password} id="password-rules" />}
              {!signup && !PUBLIC_DEMO && <Link className="gc-link gc-auth-forgot" to="/forgot-password">Forgot your password?</Link>}
              {signup && <p className="gc-note">We use your details to run your claims. Read the <Link className="gc-link" to="/privacy-policy">privacy policy</Link>.</p>}
              <button className="gc-btn gc-btn--lg gc-btn--block" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting && <span className="gc-spinner" aria-hidden="true" />}
                {isSubmitting ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in"}
              </button>
            </form>
            )}
            <div className="gc-auth-alt">
              {!PUBLIC_DEMO && <p className="gc-note">Insurance surveyor? <Link className="gc-link" to="/surveyor-apply">Apply for surveyor access</Link></p>}
              {!signup && import.meta.env.DEV && (
                <details className="gc-demo-accounts">
                  <summary>Use a demo account</summary>
                  <p className="gc-note">Fills in a seeded demo account. Seed the database first.</p>
                  <div className={cx("gc-actions")}>
                    {DEMO.map(([name, email, pass]) => (
                      <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" key={email} onClick={() => { setValue("email", `${email}@getclaim.in`); setValue("password", `${pass}@123`); }}>{name}</button>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </section>
          <nav className="gc-auth-foot" aria-label="Help">
            <Link to="/privacy-policy">Privacy policy</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </main>
    </div>
  );
}
