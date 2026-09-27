import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CircleHelp, FileText, Mail } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { api, errorMessage } from "../services/api";
import { Alert, Checkbox, ErrorState, Field, Loading, PageHeader } from "../components/UI";
import { money } from "../utils/format";

const FIRST_STEPS = [
  "Move to a safe place if you can, and switch on your hazard lights.",
  "Check whether anyone is hurt. Call 112 for police, fire or an ambulance.",
  "When it’s safe, note the place, time and the other vehicle’s number.",
  "Photograph the vehicles, number plates and the scene without stepping into traffic.",
  "Tell your insurer, and use authorised towing if the vehicle can’t be driven.",
  "Keep bills and reference numbers. Don’t start repairs before the insurer’s assessment.",
];

export function AccidentChecklist() {
  return (
    <section className="gc-card" aria-labelledby="first-steps">
      <div className="gc-card-head"><div><h2 id="first-steps">Just had an accident?</h2><p>Your safety comes first. Tick these off as you go; nothing here is saved.</p></div></div>
      <div className="gc-stack">{FIRST_STEPS.map((item) => <Checkbox key={item}>{item}</Checkbox>)}</div>
      <div className="gc-actions"><Link to="/portal/claims/new" className="gc-btn">File a claim <ArrowRight className="gc-icon" aria-hidden="true" /></Link></div>
    </section>
  );
}

export default function ClaimHelp() {
  const policies = useApi("/policies");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const list = Array.isArray(policies.data) ? policies.data : policies.data?.items || [];

  async function calculate(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(event.target));
      const response = await api.post("/calculator", { policyId: values.policyId, estimatedCost: Math.round(Number(values.estimatedCost) * 100) });
      setResult(response.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Help" description="What to do after an accident, whether a claim is worth it, and how to reach us." />
      <Alert tone="warning" title="In an emergency, call 112">getClaim can’t send police, fire or medical help.</Alert>
      <div className="gc-grid-2">
        <AccidentChecklist />
        <div className="gc-col">
        <section className="gc-card" aria-labelledby="calc-title">
          <div className="gc-card-head"><div><h2 id="calc-title">Should I claim?</h2><p>Compare a rough payout with what you might lose from your no-claim bonus. Your insurer’s assessment decides the real amount.</p></div></div>
          {policies.loading ? <Loading /> : policies.error ? <ErrorState message={policies.error} retry={policies.reload} /> : !list.length ? (
            <p className="gc-body-text">Add a policy first. <Link className="gc-link" to="/portal/insurance?add=policy">Add a policy</Link></p>
          ) : (
            <form className="gc-form" onSubmit={calculate}>
              <Field label="Policy">
                <select name="policyId" required>{list.map((policy) => <option key={policy._id} value={policy._id}>{policy.insurer} · {policy.policyNumber}</option>)}</select>
              </Field>
              <Field label="Estimated repair cost (₹)" name="estimatedCost" type="number" min="0" step="1" inputMode="numeric" required />
              <div className="gc-form-actions"><button className="gc-btn" disabled={busy} aria-busy={busy}>{busy ? "Working it out…" : "Compare"}</button></div>
            </form>
          )}
          {error && <p role="alert" className="gc-field-error">{error}</p>}
          {result && (
            <div className="gc-stack" aria-live="polite">
              <dl className="gc-ledger">
                <div><dt>Rough payout</dt><dd>{money(result.estimatedPayout)}</dd></div>
                <div className="is-deduction"><dt>No-claim bonus you might lose</dt><dd>{money(result.ncbLost)}</dd></div>
              </dl>
              <Alert tone={result.betterToClaim ? "success" : "info"} title={result.betterToClaim ? "Claiming is likely worth it" : "Think before you claim"}>
                {result.betterToClaim ? "The rough payout is more than the no-claim bonus you might lose." : "The bonus you might lose is the same or more than the payout. A claim may still make sense for you."}
              </Alert>
              <p className="gc-sample-note">Sample value, not legal advice. Confirm against the issued policy.</p>
            </div>
          )}
        </section>
        <section className="gc-card" aria-labelledby="contact-title">
          <div className="gc-card-head"><h2 id="contact-title">Contact us</h2></div>
          <div className="gc-rows">
            <div className="gc-row-item"><Mail className="gc-icon" aria-hidden="true" /><div><a className="gc-link" href="mailto:support@getclaim.in">support@getclaim.in</a><span className="gc-note">Include your claim number so we can find it quickly.</span></div></div>
            <div className="gc-row-item"><FileText className="gc-icon" aria-hidden="true" /><div><Link className="gc-link" to="/required-documents">What documents you need</Link><span className="gc-note">By claim type: damage, theft and third party.</span></div></div>
            <div className="gc-row-item"><CircleHelp className="gc-icon" aria-hidden="true" /><div><Link className="gc-link" to="/faq">Common questions</Link><span className="gc-note">Payouts, rejections, appeals and more.</span></div></div>
          </div>
        </section>
        </div>
      </div>
    </>
  );
}
