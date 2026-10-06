import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, ChevronRight, LifeBuoy, Pencil, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { api, errorMessage } from "../services/api";
import { Alert, Checkbox, Empty, ErrorState, Facts, Field, Loading, PageHeader, Plate, Reason, StatusChip, cx, plateType } from "../components/UI";
import { VehicleForm, PolicyForm } from "../components/VehiclePolicyForms";
import Evidence from "../components/Evidence";
import { GaragePicker } from "../components/ClaimWorkflow";
import { date, dateShort, money, phone } from "../utils/format";
import { Readiness, localReadiness, requiredDocumentTypes } from "../components/ClaimReadiness";

const STEPS = ["What happened", "Vehicle and policy", "People involved", "Documents", "Review and submit"];
const CLAIM_TYPES = [["OWN_DAMAGE", "Damage to my vehicle"], ["THIRD_PARTY", "Damage to someone else (third party)"], ["THEFT", "Vehicle stolen"], ["TOTAL_LOSS", "Total loss"]];
const ACCIDENT_TYPES = ["Collision", "Single-vehicle accident", "Fire", "Flood", "Vandalism"];
const blank = {
  vehicle: "",
  policy: "",
  claimType: "OWN_DAMAGE",
  estimatedLoss: "",
  garageId: "",
  accident: { date: "", time: "", type: "Collision", claimType: "Cashless", location: "", landmark: "", description: "", weather: "Clear", road: "Dry", driveable: true, injury: false, thirdParty: false },
  police: { number: "", station: "", date: "" },
  thirdParty: { name: "", registration: "", phone: "", injuryDescription: "" },
  declarationAccepted: false,
};
const schema = z.object({
  vehicle: z.string().min(1, "Choose the vehicle involved"),
  policy: z.string().min(1, "Choose a policy that covered the accident date"),
  claimType: z.enum(["OWN_DAMAGE", "THIRD_PARTY", "THEFT", "TOTAL_LOSS"]).default("OWN_DAMAGE"),
  estimatedLoss: z.coerce.number().min(0, "Enter 0 or more").default(0),
  garageId: z.string().default(""),
  accident: z.object({
    date: z.string().refine((v) => !v || new Date(v) <= new Date(), "The accident date can’t be in the future"),
    time: z.string(), type: z.string(), claimType: z.string(), location: z.string(), landmark: z.string(), description: z.string(),
    weather: z.string(), road: z.string(), driveable: z.boolean(), injury: z.boolean(), thirdParty: z.boolean(),
  }),
  police: z.object({ number: z.string(), station: z.string(), date: z.string() }),
  thirdParty: z.object({ name: z.string(), registration: z.string(), phone: z.string(), injuryDescription: z.string() }),
  declarationAccepted: z.boolean(),
});
const covers = (p, value) => p.active && !p.archived && new Date(p.startDate) <= value && new Date(p.expiryDate) >= value;
const policyState = (p, when) => (new Date(p.expiryDate) < when ? "Expired" : new Date(p.startDate) > when ? "Starts later" : !p.active ? "Inactive" : "Covers");
const typeLabel = (v) => CLAIM_TYPES.find(([k]) => k === v)?.[1] || v;
const clock = (hhmm) => { const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || ""); if (!m) return "—"; const h = Number(m[1]); return `${h % 12 || 12}:${m[2]} ${h < 12 ? "am" : "pm"}`; };

export default function NewClaim() {
  const { id } = useParams(),
    navigate = useNavigate(),
    [searchParams] = useSearchParams();
  const [claimId, setClaimId] = useState(id || null),
    [step, setStep] = useState(0),
    [detail, setDetail] = useState(null),
    [busy, setBusy] = useState(false),
    [lastSaved, setLastSaved] = useState(null),
    [loadError, setLoadError] = useState(""),
    [adding, setAdding] = useState(""),
    [stepErrors, setStepErrors] = useState({});
  const vehicles = useApi("/vehicles"),
    policies = useApi("/policies");
  const { register, watch, getValues, reset, setValue, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: blank,
  });
  const values = watch(),
    vehicleList = Array.isArray(vehicles.data) ? vehicles.data : vehicles.data?.items || [],
    policyList = Array.isArray(policies.data) ? policies.data : policies.data?.items || [],
    selectedVehicle = vehicleList.find((v) => v._id === values.vehicle);
  const selectedPolicies = useApi(values.vehicle ? `/policies?vehicleId=${values.vehicle}` : null);
  const coverageDate = useMemo(() => (values.accident?.date ? new Date(`${values.accident.date}T12:00:00`) : new Date()), [values.accident?.date]);
  const vehiclePolicies = useMemo(() => (Array.isArray(selectedPolicies.data) ? selectedPolicies.data : selectedPolicies.data?.items || []), [selectedPolicies.data]);
  const selectedPolicy = vehiclePolicies.find((p) => p._id === values.policy);

  useEffect(() => {
    const preset = searchParams.get("vehicleId");
    if (!id && preset && vehicleList.some((v) => v._id === preset) && !values.vehicle) setValue("vehicle", preset, { shouldValidate: true });
  }, [searchParams, vehicles.data, id]);
  const refresh = async (cid) => {
    const r = await api.get("/claims/" + cid);
    setDetail(r.data);
    return r.data;
  };
  useEffect(() => {
    if (!claimId) return;
    refresh(claimId)
      .then((d) => {
        if (d.claim.status !== "DRAFT") {
          navigate("/portal/claims/" + claimId);
          return;
        }
        if (id) {
          const c = d.claim;
          reset({
            ...blank,
            ...c,
            estimatedLoss: (c.estimatedLoss || 0) / 100 || "",
            vehicle: c.vehicle._id,
            policy: c.policy._id,
            accident: { ...blank.accident, ...c.accident, date: c.accident.date?.slice(0, 10) || "" },
            police: { ...blank.police, ...c.police, date: c.police?.date?.slice(0, 10) || "" },
            thirdParty: { ...blank.thirdParty, ...c.thirdParty },
          });
        }
      })
      .catch((e) => setLoadError(errorMessage(e)));
  }, [claimId]);
  // Keep the policy consistent with the accident date.
  useEffect(() => {
    if (!values.vehicle || !selectedPolicies.data) return;
    const eligible = vehiclePolicies.filter((p) => covers(p, coverageDate));
    if (selectedPolicy && !covers(selectedPolicy, coverageDate)) {
      setValue("policy", "", { shouldValidate: false });
      toast.info(`The policy you chose doesn’t cover ${date(values.accident?.date)}. Choose another in step 2.`, { id: "policy-cleared" });
    } else if (!values.policy && eligible.length === 1) setValue("policy", eligible[0]._id, { shouldValidate: true });
  }, [values.vehicle, values.accident?.date, selectedPolicies.data]);
  // Theft is a claim type, so "what happened" follows it instead of contradicting it.
  useEffect(() => {
    if (values.claimType === "THEFT" && values.accident?.type !== "Theft") setValue("accident.type", "Theft");
    if (values.claimType !== "THEFT" && values.accident?.type === "Theft") setValue("accident.type", "Collision");
  }, [values.claimType]);

  const reloadRecords = async (type, item) => {
    if (type === "vehicle") {
      await vehicles.reload();
      setValue("vehicle", item._id, { shouldValidate: true });
      setValue("policy", "");
      setAdding("policy");
    } else {
      await policies.reload();
      await selectedPolicies.reload();
      setValue("policy", item._id, { shouldValidate: true });
      setAdding("");
    }
  };

  // Field checks for each step, shown next to the fields.
  const checkStep = (index, v = getValues()) => {
    const a = v.accident || {}, e = {};
    if (index === 0) {
      if (!a.date) e["accident.date"] = "Enter the date of the accident";
      else if (new Date(a.date) > new Date()) e["accident.date"] = "The accident date can’t be in the future";
      if (!a.time) e["accident.time"] = "Enter the approximate time";
      if (!a.location?.trim()) e["accident.location"] = "Enter where it happened";
      if (!a.landmark?.trim()) e["accident.landmark"] = "Add a landmark near the spot";
      if ((a.description?.trim().length || 0) < 50) e["accident.description"] = "Describe what happened in at least 50 characters";
    }
    if (index === 1) {
      if (!v.vehicle) e.vehicle = "Choose the vehicle involved";
      else if (!v.policy) e.policy = `Choose a policy that covered ${a.date ? date(a.date) : "the accident date"}`;
      else {
        const chosen = vehiclePolicies.find((p) => p._id === v.policy);
        if (!chosen || !covers(chosen, coverageDate)) e.policy = `This policy didn’t cover ${date(a.date)}. Choose another or add one.`;
      }
    }
    if (index === 2) {
      if (a.injury || a.thirdParty) {
        if (!v.police?.number?.trim()) e["police.number"] = "Enter the FIR or diary number";
        if (!v.police?.station?.trim()) e["police.station"] = "Enter the police station";
      }
      if (a.thirdParty) {
        if (!v.thirdParty?.name?.trim()) e["thirdParty.name"] = "Enter the other person’s name";
        if (!v.thirdParty?.phone?.trim()) e["thirdParty.phone"] = "Enter their mobile number";
      }
      if (a.injury && !v.thirdParty?.injuryDescription?.trim()) e["thirdParty.injuryDescription"] = "Describe the injuries";
    }
    return e;
  };
  const err = (path) => stepErrors[path] || path.split(".").reduce((o, k) => o?.[k], errors)?.message;

  const save = async ({ quiet = false } = {}) => {
    if (!(await trigger())) {
      const d = getValues("accident.date");
      const firstBad = d && new Date(d) > new Date() ? 0 : 1;
      toast.error(firstBad === 0 ? "Check the accident date." : "Choose a vehicle and a policy that covered the accident date.");
      setStep(firstBad);
      return null;
    }
    setBusy(true);
    try {
      const body = schema.parse(getValues());
      body.estimatedLoss = Math.round((Number(body.estimatedLoss) || 0) * 100);
      let cid = claimId;
      if (cid) await api.patch(`/claims/${cid}/draft`, body);
      else {
        const r = await api.post("/claims", body);
        cid = r.data._id;
        setClaimId(cid);
      }
      await refresh(cid);
      setLastSaved(new Date());
      if (!quiet) toast.success("Draft saved. You can finish it from Claims.");
      return cid;
    } catch (e) {
      toast.error(errorMessage(e));
      return null;
    } finally {
      setBusy(false);
    }
  };
  const goStep = (index) => {
    setStep(index);
    setStepErrors({});
    requestAnimationFrame(() => document.getElementById("step-title")?.focus());
  };
  const next = async () => {
    const e = checkStep(step);
    setStepErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector("[aria-invalid='true']")?.focus());
      return;
    }
    if (step >= 1 && !(await save({ quiet: true }))) return;
    goStep(Math.min(STEPS.length - 1, step + 1));
  };
  const submit = async () => {
    const cid = await save({ quiet: true });
    if (!cid) return;
    setBusy(true);
    try {
      await api.patch(`/claims/${cid}/submit`);
      toast.success("Claim submitted. We’ll show every update here.");
      navigate("/portal/claims/" + cid);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const documents = detail?.documents || [];
  const readiness = useMemo(() => localReadiness(values, selectedPolicy, documents), [values, selectedPolicy, documents]);
  const retry = () => { vehicles.reload(); policies.reload(); selectedPolicies.reload(); setLoadError(""); };
  if (vehicles.error || policies.error || selectedPolicies.error || loadError) return <ErrorState message={loadError || "We couldn’t load your vehicles and policies."} retry={retry} />;
  const descLength = values.accident?.description?.trim().length || 0;
  const a = values.accident || {};
  const savedText = lastSaved ? `Saved ${Math.max(0, Math.round((Date.now() - lastSaved.getTime()) / 60000)) < 1 ? "just now" : `${Math.round((Date.now() - lastSaved.getTime()) / 60000)} min ago`}` : "Save to your account after choosing a vehicle and policy";

  return (
    <div className="gc-next-claim-form">
      <PageHeader
        visual="claims"
        title={id ? "Continue your claim" : "File a claim"}
        description="Five steps. Save to your account after choosing a vehicle and policy."
        action={values.vehicle && values.policy ? <button type="button" className="gc-btn gc-btn--secondary" disabled={busy} aria-busy={busy} onClick={() => save()}><Save className="gc-icon" aria-hidden="true" />Save and finish later</button> : null}
      />
      <nav aria-label="Claim steps">
        <ol className="gc-steps">
          {STEPS.map((name, i) => (
            <li key={name} className={cx(i === step && "is-current", i < step && "is-complete")}>
              <button type="button" disabled={i > step} aria-current={i === step ? "step" : undefined} onClick={() => i < step && goStep(i)}>
                <span className="gc-steps-mark" aria-hidden="true">{i < step ? <Check className="gc-icon gc-icon--sm" /> : i + 1}</span>
                <span className="gc-steps-name">{name}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="gc-form-layout">
        <section className="gc-card gc-step-card" aria-labelledby="step-title">
          <p className="gc-eyebrow gc-muted">Step {step + 1} of {STEPS.length}</p>
          <h2 id="step-title" tabIndex={-1}>{STEPS[step]}</h2>

          {step === 0 && (
            <div className="gc-form">
              <p className="gc-body-text">Tell us when and where it happened. You can change these answers until you submit.</p>
              <div className="gc-form-grid">
                <Field label="Claim type"><select {...register("claimType")}>{CLAIM_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
                {values.claimType !== "THEFT" && <Field label="What happened"><select {...register("accident.type")}>{ACCIDENT_TYPES.map((t) => <option key={t} value={t}>{t === "Single-vehicle accident" ? "Hit something (no other vehicle)" : t}</option>)}</select></Field>}
                <Field label="Accident date" error={err("accident.date")}><input type="date" max={new Date().toLocaleDateString("en-CA")} {...register("accident.date")} /></Field>
                <Field label="Time, roughly" error={err("accident.time")}><input type="time" {...register("accident.time")} /></Field>
                <Field label="Where it happened" hint="Road, area and city" error={err("accident.location")}><input autoComplete="off" {...register("accident.location")} /></Field>
                <Field label="Nearby landmark" hint="Helps the surveyor find the spot" error={err("accident.landmark")}><input autoComplete="off" placeholder="For example, Vasai Road station east gate" {...register("accident.landmark")} /></Field>
                <Field label="Weather"><select {...register("accident.weather")}>{["Clear", "Rain", "Fog", "Overcast"].map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
                <Field label="Road surface"><select {...register("accident.road")}>{["Dry", "Wet", "Damaged", "Flooded"].map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
              </div>
              <Field label="Describe what happened" hint="Direction you were driving, what hit what, and the damage you can see." error={err("accident.description")} counter={{ text: `${descLength} characters · 50 minimum`, met: descLength >= 50 }}>
                <textarea rows="5" {...register("accident.description")} />
              </Field>
              <div className="gc-form-grid">
                <Field label="How will the repair be paid?">
                  <select {...register("accident.claimType")}>
                    {(selectedPolicy?.claimTypes?.length ? selectedPolicy.claimTypes : ["Cashless", "Reimbursement"]).map((t) => <option key={t} value={t}>{t === "Cashless" ? "Cashless at a network garage" : t === "Reimbursement" ? "I pay the garage and claim it back" : t}</option>)}
                  </select>
                </Field>
                <Field label="Estimated repair cost (₹)" optional hint="Your best guess. A loss of ₹50,000 or more needs a surveyor." error={err("estimatedLoss")}><input type="number" min="0" step="1" inputMode="numeric" {...register("estimatedLoss")} /></Field>
              </div>
              {values.accident?.claimType === "Cashless" && <GaragePicker value={values.garageId || ""} onChange={(value) => setValue("garageId", value)} />}
            </div>
          )}

          {step === 1 && (
            <div className="gc-form">
              <p className="gc-body-text">Choose the vehicle and the policy that covered it on {a.date ? date(a.date) : "the accident date"}.</p>
              {vehicles.loading ? <Loading label="Loading your vehicles…" /> : vehicleList.length ? (
                <fieldset className="gc-fieldset">
                  <legend>Vehicle</legend>
                  <div className="gc-choice-grid">
                    {vehicleList.map((v) => {
                      const ok = policyList.some((p) => p.vehicle === v._id && covers(p, coverageDate));
                      return (
                        <label className="gc-choice" key={v._id}>
                          <input type="radio" name="vehicle-choice" value={v._id} checked={values.vehicle === v._id} onChange={() => { setValue("vehicle", v._id, { shouldValidate: true }); setValue("policy", ""); setAdding(""); setStepErrors({}); }} />
                          <span><strong>{v.manufacturer} {v.model}{v.variant ? ` ${v.variant}` : ""}</strong><Plate registration={v.registrationNumber} type={plateType(v)} /><small>{[v.manufacturingYear, v.vehicleType].filter(Boolean).join(" · ")}</small></span>
                          <StatusChip status={ok ? "ACTIVE" : "NO_POLICY"} family={ok ? "positive" : "critical"} label={ok ? `Covered on ${dateShort(coverageDate)}` : `No cover on ${dateShort(coverageDate)}`} />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : (
                <Empty title="You haven’t added a vehicle" description="Add the vehicle involved to continue." action={adding !== "vehicle" && <button type="button" className="gc-btn" onClick={() => setAdding("vehicle")}><Plus className="gc-icon" aria-hidden="true" />Add a vehicle</button>} />
              )}
              {err("vehicle") && <p className="gc-field-error" role="alert">{err("vehicle")}</p>}
              {Boolean(vehicleList.length) && adding !== "vehicle" && <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm gc-self-start" onClick={() => setAdding("vehicle")}><Plus className="gc-icon gc-icon--sm" aria-hidden="true" />Add a different vehicle</button>}
              {adding === "vehicle" && <div className="gc-subpanel"><h3>Add a vehicle</h3><VehicleForm onCancel={() => setAdding("")} onSaved={(v) => reloadRecords("vehicle", v)} /></div>}
              {selectedVehicle && (
                <fieldset className="gc-fieldset">
                  <legend>Policy for {selectedVehicle.manufacturer} {selectedVehicle.model}</legend>
                  {selectedPolicies.loading ? <Loading label="Loading policies…" /> : vehiclePolicies.length ? (
                    <div className="gc-choice-list">
                      {vehiclePolicies.map((p) => {
                        const eligible = covers(p, coverageDate), state = policyState(p, coverageDate);
                        return (
                          <label className="gc-choice" key={p._id} aria-disabled={!eligible || undefined}>
                            <input type="radio" name="policy-choice" disabled={!eligible} checked={values.policy === p._id} onChange={() => { setValue("policy", p._id, { shouldValidate: true }); setStepErrors({}); }} />
                            <span><strong>{p.insurer} · {p.coverageType}</strong><small><span className="gc-ref">{p.policyNumber}</span> · {date(p.startDate)} to {date(p.expiryDate)}</small><small>IDV {money(p.insuredDeclaredValue)} · deductible {money(p.deductible)}</small></span>
                            <StatusChip status={state} family={eligible ? "positive" : "critical"} label={eligible ? `Covers ${dateShort(coverageDate)}` : state} />
                          </label>
                        );
                      })}
                    </div>
                  ) : <p className="gc-body-text">No policy is saved for this vehicle yet. Add it to continue.</p>}
                  {err("policy") && <p className="gc-field-error" role="alert">{err("policy")}</p>}
                  {adding !== "policy" && <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm gc-self-start" onClick={() => setAdding("policy")}><Plus className="gc-icon gc-icon--sm" aria-hidden="true" />Add a policy</button>}
                  {adding === "policy" && <div className="gc-subpanel"><h3>Add a policy</h3><PolicyForm vehicleId={selectedVehicle._id} onCancel={() => setAdding("")} onSaved={(p) => reloadRecords("policy", p)} /></div>}
                </fieldset>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="gc-form">
              <fieldset className="gc-fieldset">
                <legend>Tick what applies</legend>
                <Checkbox {...register("accident.driveable")}>The vehicle can be driven safely</Checkbox>
                <Checkbox {...register("accident.injury")}>Someone was injured</Checkbox>
                <Checkbox {...register("accident.thirdParty")}>Another vehicle or person was involved</Checkbox>
              </fieldset>
              {a.injury || a.thirdParty ? (
                <>
                  <Alert title="Police details are needed">Because someone was injured or another party was involved, add the police report details.</Alert>
                  <div className="gc-form-grid">
                    <Field label="FIR or diary number" error={err("police.number")}><input {...register("police.number")} /></Field>
                    <Field label="Police station" error={err("police.station")}><input {...register("police.station")} /></Field>
                    <Field label="Date of the report" optional><input type="date" {...register("police.date")} /></Field>
                  </div>
                </>
              ) : <Alert title="Police details are optional for this claim">Nobody was injured and no other party was involved. Add an FIR number below if you have one.</Alert>}
              {!(a.injury || a.thirdParty) && (
                <details className="gc-disclosure"><summary>Add police details anyway</summary>
                  <div className="gc-form-grid">
                    <Field label="FIR or diary number" optional><input {...register("police.number")} /></Field>
                    <Field label="Police station" optional><input {...register("police.station")} /></Field>
                    <Field label="Date of the report" optional><input type="date" {...register("police.date")} /></Field>
                  </div>
                </details>
              )}
              {a.thirdParty && (
                <fieldset className="gc-fieldset">
                  <legend>The other party</legend>
                  <div className="gc-form-grid">
                    <Field label="Their name" error={err("thirdParty.name")}><input {...register("thirdParty.name")} /></Field>
                    <Field label="Their vehicle number" optional hint="For example, MH 02 CD 7814"><input {...register("thirdParty.registration")} /></Field>
                    <Field label="Their mobile number" error={err("thirdParty.phone")}><input type="tel" inputMode="numeric" {...register("thirdParty.phone")} /></Field>
                  </div>
                </fieldset>
              )}
              {a.injury && <Field label="Describe the injuries" error={err("thirdParty.injuryDescription")}><textarea rows="4" {...register("thirdParty.injuryDescription")} /></Field>}
            </div>
          )}

          {step === 3 && (
            <div className="gc-form">
              <p className="gc-body-text">Add what you have now. You can submit once the required documents are in, and add more later if the claims team asks.</p>
              <Evidence claimId={claimId} documents={documents} required={requiredDocumentTypes(values)} editable onChange={() => refresh(claimId)} />
            </div>
          )}

          {step === 4 && (
            <div className="gc-form">
              <ReviewBlock title="What happened" onEdit={() => goStep(0)}>
                <Facts items={[
                  ["Claim type", typeLabel(values.claimType)],
                  ["What happened", a.type],
                  ["Date and time", `${date(a.date)}, ${clock(a.time)}`],
                  ["Place", a.location ? `${a.location}${a.landmark ? `, near ${a.landmark}` : ""}` : null],
                  ["Weather and road", `${a.weather} · ${a.road}`],
                  ["Repair paid", a.claimType === "Cashless" ? "Cashless at a network garage" : "You pay, then claim back"],
                  ["Estimated cost", values.estimatedLoss ? money(Math.round(Number(values.estimatedLoss) * 100)) : "Not given"],
                  ["Description", a.description, true],
                ]} />
              </ReviewBlock>
              <ReviewBlock title="Vehicle and policy" onEdit={() => goStep(1)}>
                <Facts items={[
                  ["Vehicle", selectedVehicle ? <><span>{selectedVehicle.manufacturer} {selectedVehicle.model}</span> <Plate registration={selectedVehicle.registrationNumber} type={plateType(selectedVehicle)} /></> : null],
                  ["Policy", selectedPolicy ? `${selectedPolicy.insurer} · ${selectedPolicy.policyNumber}` : null],
                  ["Cover", selectedPolicy ? `${date(selectedPolicy.startDate)} to ${date(selectedPolicy.expiryDate)}` : null],
                ]} />
              </ReviewBlock>
              <ReviewBlock title="People involved" onEdit={() => goStep(2)}>
                <Facts items={[
                  ["Vehicle can be driven", a.driveable ? "Yes" : "No"],
                  ["Anyone injured", a.injury ? "Yes" : "No"],
                  ["Another party involved", a.thirdParty ? "Yes" : "No"],
                  (a.injury || a.thirdParty || values.police?.number) && ["Police report", values.police?.number ? `${values.police.number}, ${values.police.station}` : null],
                  a.thirdParty && ["Other party", `${values.thirdParty?.name || "—"}${values.thirdParty?.phone ? ` · ${phone(values.thirdParty.phone)}` : ""}`],
                ]} />
              </ReviewBlock>
              <ReviewBlock title="Documents" onEdit={() => goStep(3)}>
                <p className="gc-body-text">{documents.length} file{documents.length === 1 ? "" : "s"} added.</p>
              </ReviewBlock>
              <Readiness readiness={readiness} currentStep={step} onStep={goStep} />
              <Checkbox {...register("declarationAccepted")}>I declare that the information and documents I’ve given are true to the best of my knowledge.</Checkbox>
            </div>
          )}

          <div className="gc-form-nav">
            <button type="button" className="gc-btn gc-btn--secondary" disabled={step === 0 || busy} onClick={() => goStep(step - 1)}><ArrowLeft className="gc-icon" aria-hidden="true" />Back</button>
            <span className="gc-note gc-form-nav-status" aria-live="polite">{busy ? "Saving…" : savedText}</span>
            {step < STEPS.length - 1 ? (
              <button type="button" className="gc-btn" disabled={busy || vehicles.loading || selectedPolicies.loading} aria-busy={busy} onClick={next}>Continue<ChevronRight className="gc-icon" aria-hidden="true" /></button>
            ) : (
              <button type="button" className="gc-btn" disabled={busy || !values.declarationAccepted || !readiness.complete} aria-busy={busy} aria-describedby="submit-reason" onClick={submit}>{busy ? "Submitting…" : "Submit claim"}<Check className="gc-icon" aria-hidden="true" /></button>
            )}
          </div>
          {step === STEPS.length - 1 && (!readiness.complete || !values.declarationAccepted) && (
            <div id="submit-reason"><Reason>{!readiness.complete ? "Finish the items marked in the checklist above to submit." : "Tick the declaration to submit."}</Reason></div>
          )}
        </section>
        <aside className="gc-form-aside">
          {step < STEPS.length - 1 && <Readiness readiness={readiness} currentStep={step} onStep={goStep} />}
          <section className="gc-card gc-help-card" aria-labelledby="help-title">
            <LifeBuoy className="gc-icon" aria-hidden="true" />
            <h2 id="help-title">Take your time</h2>
            <p>Your answers are kept on this device, and saved to your account once you choose a vehicle and policy.</p>
            <p>In an emergency, call <a className="gc-link" href="tel:112">112</a> first.</p>
            <Link className="gc-link gc-link--arrow" to="/portal/support">First steps after an accident <ChevronRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }) {
  return (
    <section className="gc-review-block" aria-label={title}>
      <div className="gc-card-head"><h3>{title}</h3><button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={onEdit}><Pencil className="gc-icon gc-icon--sm" aria-hidden="true" />Edit<span className="gc-sr"> {title.toLowerCase()}</span></button></div>
      {children}
    </section>
  );
}
