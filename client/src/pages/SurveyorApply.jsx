import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, errorMessage } from "../services/api";
import { Alert, Field, PageHeader } from "../components/UI";
import { PasswordInput, PasswordRules, strongPassword } from "./Auth";

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name"),
    email: z.string().email("Enter an email address like name@example.in"),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number starting with 6, 7, 8 or 9"),
    password: strongPassword,
    confirmPassword: z.string(),
    surveyorId: z.string().trim().min(3, "Enter your surveyor licence or employee ID"),
    qualification: z.string().trim().min(2, "Enter your qualification"),
    experience: z.coerce.number({ invalid_type_error: "Enter your years of experience" }).min(0, "Enter 0 or more").max(70, "Enter 70 or less"),
    surveyorRegion: z.string().trim().min(2, "Enter the region you cover"),
    address: z.string().trim().min(5, "Enter your full address"),
    verificationDocument: z.any().refine((files) => files?.length === 1, "Choose your licence or ID document"),
  })
  .refine((v) => v.password === v.confirmPassword, { message: "The two passwords don’t match", path: ["confirmPassword"] });

export default function SurveyorApply() {
  const [submitted, setSubmitted] = useState(false);
  const [show, setShow] = useState(false);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  const submit = async (values) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.append(key, key === "verificationDocument" ? value[0] : value);
    try {
      await api.post("/auth/surveyor-apply", data);
      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  if (submitted)
    return (
      <div className="gc-public-main gc-public-main--narrow">
        <section className="gc-card gc-account-card">
          <h1>Application received</h1>
          <p className="gc-body-text">An administrator will check your details and document. You can sign in to the surveyor workspace once it’s approved.</p>
          <div className="gc-actions"><Link className="gc-btn" to="/login">Go to sign in</Link><Link className="gc-btn gc-btn--secondary" to="/">Home page</Link></div>
        </section>
      </div>
    );
  return (
    <div className="gc-public-main gc-public-main--narrow">
      <PageHeader title="Apply for surveyor access" description="Surveyors inspect vehicles and submit assessments for claims assigned to them. An administrator reviews every application before access is granted." />
      <section className="gc-card">
        <form className="gc-form" onSubmit={handleSubmit(submit)} noValidate>
          <fieldset className="gc-form">
            <legend className="gc-section-title">About you</legend>
            <div className="gc-form-grid">
              <Field label="Full name" error={errors.name?.message}><input autoComplete="name" {...register("name")} /></Field>
              <Field label="Email address" error={errors.email?.message}><input type="email" autoComplete="email" {...register("email")} /></Field>
              <Field label="Mobile number" error={errors.phone?.message}><input type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" {...register("phone")} /></Field>
            </div>
            <Field label="Address" error={errors.address?.message}><textarea rows="3" autoComplete="street-address" {...register("address")} /></Field>
          </fieldset>
          <fieldset className="gc-form">
            <legend className="gc-section-title">Your work</legend>
            <div className="gc-form-grid">
              <Field label="Surveyor licence or employee ID" error={errors.surveyorId?.message}><input {...register("surveyorId")} /></Field>
              <Field label="Qualification" hint="For example, B.E. Automobile" error={errors.qualification?.message}><input {...register("qualification")} /></Field>
              <Field label="Years of experience" error={errors.experience?.message}><input type="number" min="0" max="70" inputMode="numeric" {...register("experience")} /></Field>
              <Field label="Region you cover" hint="City or district" error={errors.surveyorRegion?.message}><input {...register("surveyorRegion")} /></Field>
            </div>
            <Field label="Licence or ID document" hint="JPG, PNG or PDF, up to 8 MB" error={errors.verificationDocument?.message}><input type="file" accept=".jpg,.jpeg,.png,.pdf" {...register("verificationDocument")} /></Field>
          </fieldset>
          <fieldset className="gc-form">
            <legend className="gc-section-title">Password</legend>
            <Field label="Password" error={errors.password?.message}>
              <PasswordInput show={show} onToggle={() => setShow(!show)} autoComplete="new-password" aria-describedby="apply-rules" {...register("password")} />
            </Field>
            <PasswordRules value={watch("password") || ""} id="apply-rules" />
            <Field label="Type the password again" error={errors.confirmPassword?.message}><input type={show ? "text" : "password"} autoComplete="new-password" {...register("confirmPassword")} /></Field>
          </fieldset>
          {Object.keys(errors).length > 0 && <Alert tone="error" title="Check the highlighted fields">Fix each field marked in red, then submit again.</Alert>}
          <div className="gc-form-actions">
            <button className="gc-btn gc-btn--lg" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? "Sending application…" : "Send application"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
