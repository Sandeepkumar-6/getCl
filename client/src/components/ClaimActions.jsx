import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Field } from "./UI";
import { ActionForm } from "./ClaimWorkflow";
import { money } from "../utils/format";
import { claimStatus } from "../utils/status";

// Forms staff can use at the claim's current status. With `card`, renders its own "Your actions" card, or nothing when there is nothing to do.
export function StaffActions({ data, reload, card = false }) {
  const { user } = useAuth();
  const c = data.claim, path = "/claims/" + c._id;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role), isSurveyor = user.role === "SURVEYOR";
  const workflow = data.workflow || {};
  const forms = [];

  if (isAdmin && ["SUBMITTED", "UNDER_REVIEW", "INSPECTION_COMPLETED", "APPROVED"].includes(c.status))
    forms.push(
      <ActionForm key="move" tone="panel" title={c.status === "APPROVED" ? "Close the claim" : "Review"} path={path + "/status"} method="patch" reload={reload} button="Update claim" success="Claim updated.">
        <Field label="What happens next">
          <select name="status">
            {c.status === "SUBMITTED" && <option value="UNDER_REVIEW">Start the review</option>}
            {["SUBMITTED", "UNDER_REVIEW", "INSPECTION_COMPLETED"].includes(c.status) && <option value="MORE_INFORMATION_REQUIRED">Ask the policyholder for more information</option>}
            {c.status === "APPROVED" && <option value="SETTLED">Mark the settlement complete</option>}
          </select>
        </Field>
        <Field label="Note to the policyholder" hint="Say exactly what you need or what happened. At least 10 characters."><textarea name="note" required minLength={10} rows="3" /></Field>
      </ActionForm>,
    );
  if (isAdmin && c.status === "UNDER_REVIEW" && workflow.requiresSurvey) forms.push(<Assign key="assign" path={path} reload={reload} />);
  if (isSurveyor && c.status === "SURVEYOR_ASSIGNED")
    forms.push(
      <ActionForm key="schedule" tone="panel" title="Book the inspection" path={path + "/inspection/schedule"} reload={reload} button="Book inspection" success="Inspection booked.">
        <Field label="Date and time"><input type="datetime-local" name="scheduledDate" required /></Field>
        <Field label="Where" hint="Address or garage name"><input name="inspectionLocation" required minLength={3} /></Field>
      </ActionForm>,
    );
  if (isSurveyor && c.status === "INSPECTION_SCHEDULED")
    forms.push(
      <ActionForm
        key="report"
        tone="panel"
        title="Submit the inspection report"
        path={path + "/inspection"}
        reload={reload}
        button="Submit report"
        success="Inspection report submitted."
        transform={(b) => ({ ...b, partsCost: Math.round(Number(b.partsCost) * 100), labourCost: Math.round(Number(b.labourCost) * 100), taxAmount: Math.round(Number(b.taxAmount) * 100), affectedParts: b.affectedParts.split(",").map((s) => s.trim()).filter(Boolean) })}
      >
        <Field label="Damage you saw" hint="At least 20 characters"><textarea name="damageSummary" minLength={20} required rows="3" /></Field>
        <Field label="Affected parts" hint="Separate with commas, for example: front bumper, left headlamp"><input name="affectedParts" required /></Field>
        <EstimateFields />
        <Field label="Professional notes"><textarea name="notes" minLength={10} required rows="3" /></Field>
      </ActionForm>,
    );
  if (isAdmin && ["INSPECTION_COMPLETED", "ESTIMATE_SUBMITTED", "TOTAL_LOSS"].includes(c.status))
    forms.push(
      <ActionForm key="decide" tone="panel" title="Record the decision" path={path + "/decision"} reload={reload} button="Record decision" success="Decision recorded." description="The payout and deductibles are calculated from the assessed estimate and the policy.">
        <Field label="Decision"><select name="outcome"><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option></select></Field>
        <Field label="Reason" hint="The policyholder sees this. At least 10 characters."><textarea name="reason" minLength={10} required rows="3" /></Field>
        <Field label="Policy clause relied on" hint="Sample clause reference"><input name="policyClause" required minLength={3} /></Field>
      </ActionForm>,
    );
  if (isAdmin && c.status === "APPEALED")
    forms.push(
      <ActionForm key="appeal" tone="panel" title="Review the appeal" path={path + "/appeal"} method="patch" reload={reload} button="Save appeal review" success="Appeal reviewed.">
        <Field label="Outcome"><select name="status"><option value="REOPENED">Reopen for assessment</option><option value="UPHELD">Keep the rejection</option></select></Field>
        <Field label="Explanation" hint="The policyholder sees this"><textarea name="reviewNote" minLength={10} required rows="3" /></Field>
      </ActionForm>,
    );
  if (isAdmin && workflow.allowedTransitions?.length > 0)
    forms.push(
      <details key="advance" className="gc-disclosure">
        <summary>Move to another stage</summary>
        <ActionForm path={path + "/status"} method="patch" reload={reload} button="Move claim" success="Claim moved.">
          <Field label="Next stage"><select name="status">{workflow.allowedTransitions.map((s) => <option key={s} value={s}>{claimStatus(s, user.role).label}</option>)}</select></Field>
          <Field label="Reason"><textarea name="note" required minLength={10} rows="3" /></Field>
        </ActionForm>
      </details>,
    );
  if (card) {
    if (!forms.length) return null;
    return (
      <section className="gc-card gc-actions-card" id="actions" tabIndex={-1} aria-labelledby="actions-title">
        <div className="gc-card-head"><div><h2 id="actions-title">Your actions</h2><p>What you can do at this stage. Changes are recorded in the audit history.</p></div></div>
        <div className="gc-stack-lg">{forms}</div>
      </section>
    );
  }
  if (!forms.length) return <p className="gc-body-text">Nothing needs you on this claim right now.</p>;
  return <div className="gc-stack-lg">{forms}</div>;
}

// Forms the policyholder uses when the claim is waiting on them.
export function CustomerActions({ data, reload }) {
  const { user } = useAuth();
  const c = data.claim, path = "/claims/" + c._id;
  if (user.role !== "POLICYHOLDER") return null;
  if (c.status === "MORE_INFORMATION_REQUIRED")
    return (
      <section className="gc-card gc-card--action" id="respond" aria-label="Reply to the claims team">
        <ActionForm title="Reply to the claims team" description="Upload any replacement documents in the Documents tab first, then tell the team what you’ve sent." path={path + "/respond"} method="patch" reload={reload} button="Send reply" success="Reply sent to the claims team.">
          <Field label="Your reply" hint="At least 10 characters"><textarea name="response" minLength={10} required rows="4" /></Field>
        </ActionForm>
      </section>
    );
  if (c.status === "REJECTED")
    return (
      <section className="gc-card gc-card--action" id="appeal" aria-label="Appeal this decision">
        <ActionForm title="Appeal this decision" description="Say why the decision should change. Add supporting files in the Documents tab before or after you appeal." path={path + "/appeal"} reload={reload} button="Send appeal" success="Appeal sent.">
          <Field label="Why the decision should change" hint="At least 10 characters"><textarea name="reason" minLength={10} required rows="4" /></Field>
          <Field label="Anything else that helps" optional><textarea name="supportingInformation" rows="3" /></Field>
        </ActionForm>
      </section>
    );
  return null;
}

function Assign({ path, reload }) {
  const { data, error } = useApi("/admin/surveyors");
  return (
    <ActionForm tone="panel" title="Assign a surveyor" description="IRDAI requires a surveyor within 24 hours of review for losses of ₹50,000 or more." path={path + "/assign"} method="patch" reload={reload} button="Assign surveyor" success="Surveyor assigned.">
      <Field label="Surveyor" error={error || undefined}>
        <select name="surveyor" required>
          <option value="">Choose a surveyor</option>
          {(Array.isArray(data) ? data : []).map((u) => <option key={u._id} value={u._id}>{u.name} · {u.surveyorRegion}</option>)}
        </select>
      </Field>
    </ActionForm>
  );
}

function EstimateFields() {
  const [costs, setCosts] = useState({ partsCost: "", labourCost: "", taxAmount: "" });
  const total = Object.values(costs).reduce((a, b) => a + (Number(b) || 0), 0);
  return (
    <>
      <div className="gc-form-grid">
        {[["partsCost", "Parts (₹)"], ["labourCost", "Labour (₹)"], ["taxAmount", "Tax (₹)"]].map(([key, title]) => (
          <Field key={key} label={title}>
            <input name={key} type="number" min="0" step="0.01" inputMode="decimal" required value={costs[key]} onChange={(e) => setCosts({ ...costs, [key]: e.target.value })} />
          </Field>
        ))}
      </div>
      <p className="gc-note">Estimated repair cost {money(Math.round(total * 100))}. This is the assessment; the recorded settlement is final.</p>
    </>
  );
}

// Previous default export kept for compatibility.
export default function Actions({ data, reload }) {
  const { user } = useAuth();
  return user.role === "POLICYHOLDER" ? <CustomerActions data={data} reload={reload} /> : <StaffActions data={data} reload={reload} />;
}
