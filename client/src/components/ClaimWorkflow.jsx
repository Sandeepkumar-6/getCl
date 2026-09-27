import { useState } from "react";
import { toast } from "sonner";
import { Info, Plus, Trash2 } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../services/api";
import { Field, StatusChip } from "./UI";
import { dateShort, dateTime, humaniseText, label, money } from "../utils/format";

export function GaragePicker({ value, onChange }) {
  const [search, setSearch] = useState("");
  const garages = useApi("/garages?search=" + encodeURIComponent(search), { keepPrevious: true });
  const list = garages.data?.items || (Array.isArray(garages.data) ? garages.data : []);
  return (
    <fieldset className="gc-subpanel">
      <legend className="gc-section-title">Network garage for cashless repair</legend>
      <div className="gc-form-grid">
        <Field label="Search garages" hint="By name or city" optional><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} /></Field>
        <Field label="Garage" optional error={garages.error || undefined}>
          <select value={value} onChange={(e) => onChange(e.target.value)} disabled={garages.loading}>
            <option value="">{garages.loading ? "Loading garages…" : "Choose later"}</option>
            {list.map((g) => <option key={g._id || g.id} value={g._id || g.id}>{g.name} · {g.city || g.address}</option>)}
          </select>
        </Field>
      </div>
      <p className="gc-note">Check cashless eligibility with your insurer before you authorise any repair.</p>
    </fieldset>
  );
}

// A small form that sends its fields to the claim API and reloads the claim.
export function ActionForm({ title, description, path, method = "post", transform, reload, children, button = "Save", success = "Saved.", tone }) {
  const [busy, setBusy] = useState(false);
  return (
    <section className={tone === "panel" ? "gc-action-form gc-action-form--panel" : "gc-action-form"}>
      {title && <h3>{title}</h3>}
      {description && <p className="gc-note">{description}</p>}
      <form
        className="gc-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const body = Object.fromEntries(new FormData(e.target));
            await api[method](path, transform ? transform(body) : body);
            toast.success(success);
            e.target.reset?.();
            await reload();
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        {children}
        <div className="gc-form-actions"><button className="gc-btn" disabled={busy} aria-busy={busy}>{busy ? "Saving…" : button}</button></div>
      </form>
    </section>
  );
}

const LEDGER = [
  ["gross", "Assessed repair cost", "Parts, labour and tax approved in the assessment"],
  ["depreciation", "Depreciation", "For the age of the vehicle and the materials replaced. Zero-depreciation cover can waive this."],
  ["policyDeductible", "Compulsory deductible", "The fixed amount your policy asks you to pay"],
  ["voluntaryDeductible", "Voluntary deductible", "The extra amount you chose to pay when you bought the policy"],
  ["salvage", "Salvage", "Value of damaged parts that can be recovered"],
];

export function SettlementBreakdown({ settlement, total = "You receive" }) {
  if (!settlement) return <p className="gc-body-text">The payout is worked out after the repair cost is assessed.</p>;
  return (
    <>
      <dl className="gc-ledger">
        {LEDGER.filter(([key]) => key === "gross" || settlement[key]).map(([key, title, why]) => (
          <div key={key} className={key === "gross" ? undefined : "is-deduction"}>
            <dt>{title}<small>{why}</small></dt>
            <dd>{key === "gross" ? money(settlement[key]) : `− ${money(settlement[key])}`}</dd>
          </div>
        ))}
        <div className="is-total"><dt>{total}</dt><dd>{money(settlement.netPayable)}</dd></div>
      </dl>
      {settlement.ncbImpact ? <p className="gc-note">Your no-claim bonus at renewal may be lower by about {money(settlement.ncbImpact)}. This isn’t taken from the payout.</p> : null}
      <p className="gc-sample-note"><Info className="gc-icon gc-icon--sm" aria-hidden="true" />Sample value, not legal advice. Confirm against the issued policy.</p>
    </>
  );
}

const CATEGORY = [["OTHER", "Metal and other parts"], ["PLASTIC", "Plastic, rubber or tyres"], ["GLASS", "Glass"], ["FIBRE_GLASS", "Fibre glass"], ["PAINT", "Paint"]];

function EstimateForm({ path, reload, supplementary }) {
  const blankItem = { part: "", category: "OTHER", cost: "", labour: "" };
  const [items, setItems] = useState([blankItem]);
  const set = (index, key, value) => setItems(items.map((v, n) => (n === index ? { ...v, [key]: value } : v)));
  const total = items.reduce((sum, i) => sum + (Number(i.cost) || 0) + (Number(i.labour) || 0), 0);
  return (
    <ActionForm
      title={supplementary ? "Submit an extra estimate" : "Submit a repair estimate"}
      description="One line per part. Amounts in rupees."
      path={path + "/estimates"}
      reload={async () => { setItems([blankItem]); await reload(); }}
      button={supplementary ? "Submit extra estimate" : "Submit estimate"}
      success="Estimate submitted."
      transform={() => ({ supplementary, lineItems: items.map((i) => ({ ...i, cost: Math.round(Number(i.cost) * 100), labour: Math.round(Number(i.labour) * 100) })) })}
    >
      {items.map((item, index) => (
        <fieldset className="gc-line-item" key={index}>
          <legend className="gc-sr">Line {index + 1}</legend>
          <Field label="Part"><input required value={item.part} onChange={(e) => set(index, "part", e.target.value)} /></Field>
          <Field label="Material"><select value={item.category} onChange={(e) => set(index, "category", e.target.value)}>{CATEGORY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Part cost (₹)"><input required type="number" min="0" step="0.01" inputMode="decimal" value={item.cost} onChange={(e) => set(index, "cost", e.target.value)} /></Field>
          <Field label="Labour (₹)"><input required type="number" min="0" step="0.01" inputMode="decimal" value={item.labour} onChange={(e) => set(index, "labour", e.target.value)} /></Field>
          {items.length > 1 && <button type="button" className="gc-btn gc-btn--quiet gc-btn--icon gc-line-remove" aria-label={`Remove line ${index + 1}`} onClick={() => setItems(items.filter((_, n) => n !== index))}><Trash2 className="gc-icon" aria-hidden="true" /></button>}
        </fieldset>
      ))}
      <div className="gc-actions">
        <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" onClick={() => setItems([...items, blankItem])}><Plus className="gc-icon gc-icon--sm" aria-hidden="true" />Add a line</button>
        <span className="gc-note">Total {money(Math.round(total * 100))}</span>
      </div>
    </ActionForm>
  );
}

export function EstimatesSection({ data, reload }) {
  const { user } = useAuth();
  const c = data.claim, path = "/claims/" + c._id;
  const staff = ["ADMIN", "SUPER_ADMIN"].includes(user.role), customer = user.role === "POLICYHOLDER";
  const estimates = data.estimates || [];
  return (
    <section className="gc-card" aria-labelledby="estimates-title">
      <div className="gc-card-head"><h2 id="estimates-title">Repair estimates</h2></div>
      {!estimates.length && <p className="gc-body-text">No estimate has been submitted yet.</p>}
      <ul className="gc-record-list">
        {estimates.map((e) => (
          <li key={e._id}>
            <div className="gc-record-head"><strong>{e.supplementary ? "Extra estimate" : "Repair estimate"}</strong><StatusChip status={e.status} kind="estimate" /></div>
            <table className="gc-table gc-table--compact">
              <thead><tr><th scope="col">Part</th><th scope="col">Parts</th><th scope="col">Labour</th></tr></thead>
              <tbody>{e.lineItems?.map((item, i) => <tr key={i}><td>{item.part}</td><td className="gc-num">{money(item.cost)}</td><td className="gc-num">{money(item.labour)}</td></tr>)}</tbody>
            </table>
            {staff && e.status === "PENDING" && (
              <ActionForm title="Assess this estimate" path={path + "/estimates/" + e._id} method="patch" reload={reload} button="Save assessment" success="Estimate assessed.">
                <Field label="Decision"><select name="status"><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option></select></Field>
                <Field label="Assessment note"><textarea name="note" required minLength={5} rows="3" /></Field>
              </ActionForm>
            )}
          </li>
        ))}
      </ul>
      {(customer || staff) && !["DRAFT", "SETTLED", "REJECTED"].includes(c.status) && (
        <details className="gc-disclosure"><summary>{estimates.some((e) => e.status === "APPROVED") ? "Submit an extra estimate" : "Submit a repair estimate"}</summary><EstimateForm path={path} reload={reload} supplementary={estimates.some((e) => e.status === "APPROVED")} /></details>
      )}
    </section>
  );
}

export function PaymentsSection({ data, reload }) {
  const { user } = useAuth();
  const staff = ["ADMIN", "SUPER_ADMIN"].includes(user.role);
  const path = "/claims/" + data.claim._id;
  const payments = data.payments || [];
  return (
    <section className="gc-card" aria-labelledby="payments-title">
      <div className="gc-card-head"><div><h2 id="payments-title">Payments</h2><p>Records only. getClaim doesn’t start bank transfers.</p></div></div>
      {payments.length ? (
        <div className="gc-table-wrap">
          <table className="gc-table">
            <thead><tr><th scope="col">Payment</th><th scope="col">Amount</th><th scope="col">Reference</th><th scope="col">Date</th><th scope="col">Status</th></tr></thead>
            <tbody>{payments.map((p) => <tr key={p._id}><td>{p.kind === "INTERIM" ? "On-account payment" : p.kind === "FINAL" ? "Final payment" : label(p.kind)}</td><td className="gc-num">{money(p.amount)}</td><td><span className="gc-ref">{p.reference}</span></td><td>{dateShort(p.date)}</td><td><StatusChip status={p.status} kind="payment" /></td></tr>)}</tbody>
          </table>
        </div>
      ) : <p className="gc-body-text">No payments recorded yet.</p>}
      {staff && data.settlement && (
        <details className="gc-disclosure"><summary>Record a payment</summary>
          <ActionForm path={path + "/payments"} reload={reload} button="Record payment" success="Payment recorded." description="The amount comes from the settlement, and overpayment is blocked.">
            <div className="gc-form-grid">
              <Field label="Payment"><select name="kind"><option value="INTERIM">On-account payment</option><option value="FINAL">Final payment</option></select></Field>
              <Field label="Paid by"><select name="mode"><option value="BANK_TRANSFER">Bank transfer</option><option value="CHEQUE">Cheque</option><option value="CASHLESS">Cashless, to the garage</option></select></Field>
              <Field label="Reference"><input name="reference" required minLength={3} /></Field>
              <Field label="Date paid"><input name="date" type="date" required max={new Date().toISOString().slice(0, 10)} /></Field>
            </div>
          </ActionForm>
        </details>
      )}
    </section>
  );
}

export function RepairSection({ data, reload }) {
  const { user } = useAuth();
  const c = data.claim, path = "/claims/" + c._id;
  const staff = ["ADMIN", "SUPER_ADMIN"].includes(user.role), customer = user.role === "POLICYHOLDER";
  const updates = data.repairUpdates || [];
  const photos = (data.documents || []).filter((d) => d.mimeType?.startsWith("image/"));
  return (
    <section className="gc-card" aria-labelledby="repair-title">
      <div className="gc-card-head"><h2 id="repair-title">Repair progress</h2></div>
      {updates.length ? (
        <ol className="gc-timeline">
          {updates.map((r) => (
            <li key={r._id}><span className="gc-timeline-dot" aria-hidden="true" /><div><strong>{label(r.status)}</strong><p>{humaniseText(r.note)}</p><span className="gc-note">{dateTime(r.createdAt)}{r.documentIds?.length ? ` · ${r.documentIds.length} photo${r.documentIds.length > 1 ? "s" : ""} in Documents` : ""}</span></div></li>
          ))}
        </ol>
      ) : <p className="gc-body-text">No repair updates yet.</p>}
      {(staff || customer) && !["DRAFT", "SETTLED"].includes(c.status) && (
        <details className="gc-disclosure"><summary>Add a repair update</summary>
          <ActionForm path={path + "/repair-updates"} reload={reload} button="Add update" success="Repair update added." transform={(b) => ({ ...b, ...(b.status ? {} : { status: undefined }), documentIds: b.documentIds ? b.documentIds.split(",") : [] })}>
            <Field label="What’s happened"><textarea name="note" required minLength={10} rows="3" /></Field>
            {staff && <Field label="Repair stage"><select name="status"><option value="">Keep the current stage</option><option value="REPAIR_IN_PROGRESS">Repair in progress</option><option value="READY_FOR_DELIVERY">Ready for delivery</option></select></Field>}
            <Field label="Photo" optional hint="Upload repair photos in Documents first"><select name="documentIds"><option value="">No photo</option>{photos.map((d) => <option key={d._id} value={d._id}>{d.originalName}</option>)}</select></Field>
          </ActionForm>
        </details>
      )}
    </section>
  );
}

const STAGE_NAME = { INSURER: "Complaint to the insurer", BIMA_BHAROSA: "Escalated to Bima Bharosa", OMBUDSMAN: "Escalated to the Insurance Ombudsman" };

export function GrievanceSection({ data, reload }) {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [preparing, setPreparing] = useState(false);
  const c = data.claim, path = "/claims/" + c._id;
  const staff = ["ADMIN", "SUPER_ADMIN"].includes(user.role), customer = user.role === "POLICYHOLDER";
  const grievances = data.grievances || [];
  const prepare = async () => {
    setPreparing(true);
    try { const r = await api.get(path + "/grievance-draft"); setDraft(r.data.draft || r.data.message || ""); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setPreparing(false); }
  };
  if (!customer && !grievances.length) return null;
  return (
    <section className="gc-card" aria-labelledby="grievance-title">
      <div className="gc-card-head"><div><h2 id="grievance-title">Complaints</h2><p>If you’re unhappy with how this claim is handled, you can complain to the insurer and then escalate.</p></div></div>
      {grievances.length > 0 && (
        <ul className="gc-record-list">
          {grievances.map((g) => (
            <li key={g._id}>
              <div className="gc-record-head"><strong>{STAGE_NAME[g.stage] || label(g.stage)}</strong>{g.resolution ? <StatusChip status="RESOLVED" family="positive" label="Resolved" /> : <StatusChip status="OPEN" family="progress" label="Open" />}</div>
              <p className="gc-pre">{g.message}</p>
              {g.resolution && <p><strong>Resolution:</strong> {g.resolution}</p>}
              {customer && g.stage !== "OMBUDSMAN" && !g.resolution && (
                <ActionForm path={path + "/grievances/" + g._id} method="patch" reload={reload} button={g.stage === "INSURER" ? "Record escalation to Bima Bharosa" : "Record escalation to the Ombudsman"} success="Escalation recorded." transform={() => ({ stage: g.stage === "INSURER" ? "BIMA_BHAROSA" : "OMBUDSMAN" })} description="This records the escalation here. Submit the complaint to that authority yourself." />
              )}
              {staff && !g.resolution && (
                <ActionForm title="Resolve this complaint" path={path + "/grievances/" + g._id} method="patch" reload={reload} button="Save resolution" success="Complaint resolved.">
                  <Field label="Resolution"><textarea name="resolution" required minLength={10} rows="3" /></Field>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      )}
      {customer && (
        <details className="gc-disclosure"><summary>Raise a complaint with the insurer</summary>
          <div className="gc-stack">
            <p className="gc-note">We can draft the complaint from this claim’s history. Read it and change anything before you send it.</p>
            <div><button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" onClick={prepare} disabled={preparing} aria-busy={preparing}>{preparing ? "Preparing…" : "Draft it from the claim history"}</button></div>
            <ActionForm path={path + "/grievances"} reload={reload} button="Send complaint" success="Complaint recorded.">
              <Field label="Your complaint"><textarea name="message" value={draft} onChange={(e) => setDraft(e.target.value)} required minLength={10} rows="8" /></Field>
            </ActionForm>
          </div>
        </details>
      )}
    </section>
  );
}

// Kept for any caller that still renders the whole workflow block.
export default function ClaimWorkflow({ data, reload }) {
  return (
    <div className="gc-stack-lg">
      <EstimatesSection data={data} reload={reload} />
      <PaymentsSection data={data} reload={reload} />
      <RepairSection data={data} reload={reload} />
      <GrievanceSection data={data} reload={reload} />
    </div>
  );
}

