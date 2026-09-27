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

export default function Auth({ register: signup = false }) {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticate } = useAuth();
  const from = location.state?.from;
  const schema = z.object({
    email: z.string().email("Enter an email address like name@example.in"),
    password: signup ? strongPassword : z.string().min(1, "Enter your password").max(72),
    ...(signup
      ? {
          name: z.string().trim().min(2, "Enter your full name"),
          phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number starting with 6, 7, 8 or 9"),
        }
      : {}),
  });
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  const password = watch("password") || "";
  const submit = async (data) => {
    try {
      const account = await authenticate(signup ? "register" : "login", data);
      toast.success(signup ? "Account created. Check your email for the verification link." : `Signed in as ${account.name}.`);
      navigate(account.mustChangePassword ? "/change-password" : from && from.startsWith("/portal") ? from : "/portal", { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    }
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
              <h1 id="auth-title">{signup ? "Create your account" : "Sign in"}</h1>
              <p className="gc-auth-switch">
                {signup ? <>Already have an account? <Link className="gc-link" to="/login" state={location.state}>Sign in</Link></> : <>New to getClaim? <Link className="gc-link" to="/register" state={location.state}>Create an account</Link></>}
              </p>
              {from && !signup && <p className="gc-note">Sign in to continue to the page you asked for.</p>}
            </header>
            <form className="gc-form gc-auth-form" onSubmit={handleSubmit(submit)} noValidate>
              {signup && <Field label="Full name" error={errors.name?.message}><input autoComplete="name" {...register("name")} /></Field>}
              <Field label="Email address" error={errors.email?.message}><input type="email" autoComplete="email" inputMode="email" placeholder="name@example.in" {...register("email")} /></Field>
              {signup && <Field label="Mobile number" hint="We send claim updates to this number" error={errors.phone?.message}><input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98765 43210" {...register("phone")} /></Field>}
              <Field label="Password" error={errors.password?.message}>
                <PasswordInput show={showPassword} onToggle={() => setShowPassword(!showPassword)} autoComplete={signup ? "new-password" : "current-password"} aria-describedby={signup ? "password-rules" : undefined} {...register("password")} />
              </Field>
              {signup && <PasswordRules value={password} id="password-rules" />}
              {!signup && <Link className="gc-link gc-auth-forgot" to="/forgot-password">Forgot your password?</Link>}
              {signup && <p className="gc-note">We use your details to run your claims. Read the <Link className="gc-link" to="/privacy-policy">privacy policy</Link>.</p>}
              <button className="gc-btn gc-btn--lg gc-btn--block" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting && <span className="gc-spinner" aria-hidden="true" />}
                {isSubmitting ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in"}
              </button>
            </form>
            <div className="gc-auth-alt">
              <p className="gc-note">Insurance surveyor? <Link className="gc-link" to="/surveyor-apply">Apply for surveyor access</Link></p>
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
