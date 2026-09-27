import { Check, Circle } from "lucide-react";
import { docLabel } from "../utils/format";

const covers = (p, value) => p.active && !p.archived && new Date(p.startDate) <= value && new Date(p.expiryDate) >= value;

// Mirrors the server's submission checklist (server/src/services/claims.js readiness()).
export function requiredDocumentTypes(values) {
  const a = values.accident || {};
  const docs = ["Registration Certificate", "Insurance policy"];
  if (values.claimType !== "THEFT") docs.push("Driving licence");
  if (["THEFT", "THIRD_PARTY"].includes(values.claimType) || a.injury || a.thirdParty) docs.push("FIR or police report");
  if (values.claimType === "THEFT") docs.push("Keys and theft declaration", "Untraced police report", "RTO transfer or cancellation papers");
  else if (values.claimType === "THIRD_PARTY") docs.push("Legal or MACT notice");
  else docs.push("Front damage photograph");
  return docs;
}

export function localReadiness(values, policy, documents) {
  const a = values.accident || {},
    usable = documents.filter((d) => d.verificationStatus !== "REJECTED"),
    has = (t) => usable.some((d) => d.documentType === t),
    coverageDate = a.date ? new Date(`${a.date}T12:00:00`) : new Date();
  const required = requiredDocumentTypes(values);
  const missingDocs = required.filter((t) => !has(t));
  const rules = [
    ["Vehicle and a policy covering the accident date", 1, !!values.vehicle && !!policy && covers(policy, coverageDate)],
    ["Accident date and time", 0, !!a.date && !!a.time],
    ["Location and nearby landmark", 0, !!a.location && !!a.landmark],
    ["Description of at least 50 characters", 0, (a.description?.trim().length || 0) >= 50],
    ["What happened, weather and road", 0, !!a.type && !!a.weather && !!a.road],
    ["Police and other-party details, when needed", 2,
      ((!a.injury && !a.thirdParty) || (!!values.police?.number && !!values.police?.station)) &&
      (!a.thirdParty || (!!values.thirdParty?.name && !!values.thirdParty?.phone)) &&
      (!a.injury || !!values.thirdParty?.injuryDescription)],
    [missingDocs.length ? `Documents: ${missingDocs.map(docLabel).join(", ")}` : "Required documents", 3, missingDocs.length === 0],
  ];
  const done = rules.filter((r) => r[2]).length;
  return {
    score: Math.round((done / rules.length) * 100),
    complete: done === rules.length,
    done,
    rules: rules.map(([label, step, complete]) => ({ label, step, complete })),
  };
}

export { docLabel };

// Checklist view. Accepts the local result or the server's { score, rules }.
export function Readiness({ readiness, onStep, currentStep, title = "Before you submit" }) {
  const rules = readiness.rules || [];
  const done = rules.filter((r) => r.complete).length;
  return (
    <section className="gc-card gc-checklist-card" aria-labelledby="readiness-title">
      <div className="gc-card-head"><div><h2 id="readiness-title">{title}</h2><p>{done} of {rules.length} done. This checks completeness, not whether the claim will be approved.</p></div></div>
      <div className="gc-progress" role="progressbar" aria-label="Checklist progress" aria-valuemin={0} aria-valuemax={rules.length} aria-valuenow={done}><span style={{ width: `${rules.length ? (done / rules.length) * 100 : 0}%` }} /></div>
      <ul className="gc-checklist">
        {rules.map((r) => (
          <li key={r.label} className={r.complete ? "is-done" : undefined}>
            {r.complete ? <Check className="gc-icon gc-icon--sm" aria-hidden="true" /> : <Circle className="gc-icon gc-icon--sm" aria-hidden="true" />}
            <span>{r.label}<span className="gc-sr">{r.complete ? " (done)" : " (to do)"}</span></span>
            {!r.complete && onStep && r.step != null && (currentStep == null || r.step <= currentStep ? <button type="button" className="gc-text-button" onClick={() => onStep(r.step)}>Fix<span className="gc-sr">: {r.label}</span></button> : <span className="gc-note">Step {r.step + 1}</span>)}
          </li>
        ))}
      </ul>
    </section>
  );
}
