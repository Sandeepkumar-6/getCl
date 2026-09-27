import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useVehicleWorkspace } from "../hooks/useVehicleWorkspace";
import { useApi } from "../hooks/useApi";
import { api, errorMessage } from "../services/api";
import { Confirm, Empty, ErrorState, Loading, PageHeader, StatusChip, cx } from "../components/UI";
import { VehicleSwitcher, VehicleWorkspaceGate } from "../components/VehicleWorkspace";
import { DocumentList, PolicySummary, ReminderList } from "../components/VehicleOverviewPanels";
import { PolicyForm } from "../components/VehiclePolicyForms";
import { activeClaims, currentPolicy, vehicleReminders } from "../utils/vehicleWorkspace";
import { dateShort, label } from "../utils/format";
import VehicleCare from "./VehicleCare";

function WorkspacePage({ title, description, action, children }) {
  const workspace = useVehicleWorkspace();
  return (
    <>
      <PageHeader title={title} description={description} action={workspace.selected && action?.(workspace.selected)} />
      <VehicleWorkspaceGate workspace={workspace}>
        <VehicleSwitcher workspace={workspace} />
        {workspace.selected && <div key={workspace.selected._id} className="gc-stack-lg">{children(workspace.selected)}</div>}
      </VehicleWorkspaceGate>
    </>
  );
}

export function PrimaryVehiclePage() {
  return <WorkspacePage title="Your vehicle" description="Service records, checks, documents, reminders and claims.">{(vehicle) => <VehicleCare vehicleId={vehicle._id} embedded />}</WorkspacePage>;
}

export function PolicyOverviewPage() {
  return <WorkspacePage title="Policies" description="Cover, renewal dates and policy files for the vehicle you choose.">{(vehicle) => <PolicyContent vehicle={vehicle} />}</WorkspacePage>;
}

function PolicyContent({ vehicle }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const result = useApi(`/vehicles/${vehicle._id}/care`);
  const [record, setRecord] = useState(params.get("add") === "policy" ? {} : null);
  const closeForm = () => { setRecord(null); const next = new URLSearchParams(params); next.delete("add"); setParams(next, { replace: true }); };
  const remove = async (policy) => {
    try { const { data } = await api.delete(`/policies/${policy._id}`); toast.success(data.message); result.reload(); }
    catch (error) { toast.error(errorMessage(error)); throw error; }
  };
  if (result.loading) return <Loading label="Loading policies…" />;
  if (result.error && !result.data) return <ErrorState message={result.error} retry={result.reload} />;
  const policies = result.data.policies;
  const preferred = currentPolicy(policies);
  const ordered = preferred ? [preferred, ...policies.filter((p) => p._id !== preferred._id)] : [];
  return (
    <>
      {user.emailVerified && !record && <div><button type="button" className="gc-btn gc-btn--secondary" onClick={() => setRecord({})}><Plus className="gc-icon" aria-hidden="true" />Add a policy for {vehicle.manufacturer} {vehicle.model}</button></div>}
      {record && (
        <section className="gc-card" aria-labelledby="policy-form-title">
          <div className="gc-card-head"><h2 id="policy-form-title">{record._id ? `Edit policy ${record.policyNumber}` : "Add a policy"}</h2></div>
          <PolicyForm vehicleId={vehicle._id} record={record} onSaved={() => { closeForm(); result.reload(); }} onCancel={closeForm} />
        </section>
      )}
      {!ordered.length && !record && <Empty level={2} title="No policy added" description="Add this vehicle’s insurance details and policy file to see cover and renewal dates." />}
      {ordered.map((policy) => {
        const linked = result.data.claims.filter((claim) => claim.policy === policy._id);
        const open = activeClaims(linked).length;
        return (
          <div className="gc-stack" key={policy._id}>
            <div className="gc-grid-2">
              <PolicySummary policy={policy} vehicle={vehicle} full />
              <section className="gc-card" aria-labelledby={`policy-claims-${policy._id}`}>
                <div className="gc-card-head">
                  <div>
                    <h2 id={`policy-claims-${policy._id}`}>Claims on this policy</h2>
                    <p>{linked.length ? `${linked.length} claim${linked.length === 1 ? "" : "s"} · ${open} open` : "Claims you file while this cover is active are linked to it."}</p>
                  </div>
                </div>
                {linked.length ? (
                  <ul className="gc-record-list gc-record-list--rows">
                    {linked.slice(0, 4).map((c) => <li key={c._id}><Link className="gc-ref gc-link" to={`/portal/claims/${c._id}`}>{c.claimNumber}</Link><span className="gc-note">{dateShort(c.submittedAt || c.createdAt)}</span><StatusChip status={c.status} /></li>)}
                  </ul>
                ) : (
                  <Empty title="No claims on this policy" description={policy.status === "ACTIVE" ? "If this vehicle is damaged or stolen while the cover is active, file a claim against it." : "No claims were filed while this policy was in force."} action={policy.status === "ACTIVE" ? <Link className="gc-btn gc-btn--secondary gc-btn--sm" to={`/portal/claims/new?vehicleId=${vehicle._id}`}>File a claim</Link> : undefined} />
                )}
                {linked.length > 0 && <Link className="gc-link gc-link--arrow" to={`/portal/claims?vehicleId=${vehicle._id}&policyId=${policy._id}`}>{linked.length > 4 ? `All ${linked.length} claims on this policy` : "Open in Claims"} <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link>}
              </section>
            </div>
            {user.emailVerified && (
              <div className="gc-actions">
                <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={() => setRecord(policy)}><Pencil className="gc-icon gc-icon--sm" aria-hidden="true" />Edit<span className="gc-sr"> policy {policy.policyNumber}</span></button>
                <Confirm title={`Remove policy ${policy.policyNumber}?`} description="A policy with claims is archived so its claim history stays available. Otherwise it’s deleted." confirmLabel="Remove policy" onConfirm={() => remove(policy)}>
                  {(open) => <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm gc-danger-text" onClick={open}><Trash2 className="gc-icon gc-icon--sm" aria-hidden="true" />Remove<span className="gc-sr"> policy {policy.policyNumber}</span></button>}
                </Confirm>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function VehicleDocumentsPage() {
  return (
    <WorkspacePage
      title="Documents"
      description="Policy files, vehicle papers, service invoices and claim documents for the vehicle you choose."
      action={(vehicle) => <Link className="gc-btn gc-btn--secondary" to={`/portal/vehicles/${vehicle._id}?action=document#documents`}><Upload className="gc-icon" aria-hidden="true" />Upload a vehicle document</Link>}
    >
      {(vehicle) => <DocumentContent vehicle={vehicle} />}
    </WorkspacePage>
  );
}

const CATEGORIES = ["All", "Policy", "Vehicle", "Claim", "Service"];
const GROUP_TITLE = { Policy: "Policy files", Vehicle: "Vehicle papers", Service: "Service invoices" };
// Policy, vehicle and service files first, then one group per claim (newest claim documents first).
function groupDocuments(documents, claims) {
  const groups = Object.entries(GROUP_TITLE).map(([key, title]) => ({ key, title, docs: documents.filter((d) => d.category === key) })).filter((g) => g.docs.length);
  const byClaim = new Map();
  documents.filter((d) => d.category === "Claim").forEach((d) => byClaim.set(d.type, [...(byClaim.get(d.type) || []), d]));
  byClaim.forEach((docs, number) => groups.push({ key: number || "claim", title: number ? `Claim ${number}` : "Claim documents", docs, claim: claims.find((c) => c.claimNumber === number) }));
  return groups;
}
function DocumentContent({ vehicle }) {
  const result = useApi(`/vehicles/${vehicle._id}/care`);
  const [category, setCategory] = useState("All");
  if (result.loading) return <Loading label="Loading documents…" />;
  if (result.error && !result.data) return <ErrorState message={result.error} retry={result.reload} />;
  const documents = result.data.documentLibrary || [];
  const filtered = documents.filter((doc) => category === "All" || doc.category === category);
  const count = (c) => (c === "All" ? documents.length : documents.filter((d) => d.category === c).length);
  const groups = groupDocuments(filtered, result.data.claims);
  return (
    <section className="gc-card" aria-label="Documents">
      <div className="gc-segmented" role="group" aria-label="Show documents of type">
        {CATEGORIES.map((value) => <button type="button" className={cx(category === value && "is-active")} aria-pressed={category === value} onClick={() => setCategory(value)} key={value}>{value} <span className="gc-note">{count(value)}</span></button>)}
      </div>
      {groups.map((group) => (
        <section className="gc-doc-group" key={group.key} aria-labelledby={`docs-${group.key}`}>
          <div className="gc-doc-group-head">
            <h2 id={`docs-${group.key}`}>{group.title}</h2>
            <span className="gc-note">{group.docs.length} file{group.docs.length === 1 ? "" : "s"}</span>
            {group.claim && <StatusChip status={group.claim.status} />}
            {group.claim && <Link className="gc-link gc-link--arrow" to={`/portal/claims/${group.claim._id}?tab=documents`}>Open claim <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link>}
          </div>
          <DocumentList documents={group.docs} grouped />
        </section>
      ))}
      {!groups.length && <DocumentList
        documents={[]}
        emptyAction={
          <Link className="gc-btn gc-btn--secondary gc-btn--sm" to={category === "Claim" ? `/portal/claims?vehicleId=${vehicle._id}` : category === "Policy" ? `/portal/insurance?vehicleId=${vehicle._id}` : `/portal/vehicles/${vehicle._id}?action=${category === "Service" ? "service" : "document"}`}>
            {category === "Claim" ? "Add documents from a claim" : category === "Policy" ? "Add a policy file" : category === "Service" ? "Add a service with its invoice" : "Upload a document"}
          </Link>
        }
      />}
    </section>
  );
}

export function VehicleRemindersPage() {
  return (
    <WorkspacePage
      title="Reminders"
      description="Saved reminders and dates that come from your policy and service records."
      action={(vehicle) => <Link className="gc-btn gc-btn--secondary" to={`/portal/vehicles/${vehicle._id}?action=reminder#reminders`}><Plus className="gc-icon" aria-hidden="true" />Add a reminder</Link>}
    >
      {(vehicle) => <ReminderContent vehicle={vehicle} />}
    </WorkspacePage>
  );
}

function ReminderContent({ vehicle }) {
  const result = useApi(`/vehicles/${vehicle._id}/care`);
  if (result.loading) return <Loading label="Loading reminders…" />;
  if (result.error && !result.data) return <ErrorState message={result.error} retry={result.reload} />;
  const reminders = vehicleReminders(result.data);
  const completed = result.data.reminders.filter((r) => ["COMPLETED", "DISMISSED"].includes(r.status));
  return (
    <section className="gc-card" aria-label="Reminders">
      <p className="gc-note">{reminders.length} to do for {vehicle.manufacturer} {vehicle.model}</p>
      <ReminderList reminders={reminders} vehicle={vehicle} onChange={result.reload} />
      {completed.length > 0 && (
        <details className="gc-disclosure">
          <summary>{completed.length} done or dismissed</summary>
          <ul className="gc-plain-list">{completed.map((r) => <li key={r._id}><Check className="gc-icon gc-icon--sm" aria-hidden="true" />{r.title} · {label(r.status)}</li>)}</ul>
        </details>
      )}
    </section>
  );
}
