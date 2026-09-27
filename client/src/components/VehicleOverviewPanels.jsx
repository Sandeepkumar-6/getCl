import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, Check, Download, FileText, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { api, downloadPolicy, errorMessage } from "../services/api";
import { Empty, Facts, Plate, StatusChip, cx, plateType } from "./UI";
import VehicleImage from "./VehicleImage";
import ClaimTable from "./ClaimTable";
import { date, dateTime, dateShort, docLabel, label } from "../utils/format";
import { describe } from "../utils/status";
import { activeClaims, currentPolicy, dayDifference } from "../utils/vehicleWorkspace";
import { useAuth } from "../context/AuthContext";

export function SectionHeading({ title, to, action = "View all", id }) {
  return (
    <div className="gc-card-head">
      <h2 id={id}>{title}</h2>
      {to && <Link className="gc-link gc-link--arrow" to={to}>{action} <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link>}
    </div>
  );
}

// `children` are the owner's tools (odometer, photo, colour), shown in a strip under the picture and details.
export function VehicleIdentity({ data, link = true, children }) {
  const { vehicle } = data;
  return (
    <section className="gc-card gc-vehicle-card" aria-labelledby={`veh-${vehicle._id}`}>
      <VehicleImage vehicle={vehicle} size="detail" />
      <div className="gc-vehicle-card-body">
        <div>
          <h2 id={`veh-${vehicle._id}`}>{vehicle.manufacturer} {vehicle.model}</h2>
          <p className="gc-muted">{[vehicle.variant, vehicle.color, vehicle.vehicleType].filter(Boolean).join(" · ") || "Add the variant and colour in vehicle details"}</p>
        </div>
        <Plate registration={vehicle.registrationNumber} type={plateType(vehicle)} size="lg" />
        <Facts items={[
          ["Year", vehicle.manufacturingYear],
          ["Fuel", vehicle.fuelType],
          ["Odometer", vehicle.currentOdometer == null ? "Not recorded" : `${vehicle.currentOdometer.toLocaleString("en-IN")} km`],
        ]} />
        {link && <Link className="gc-link gc-link--arrow" to={`/portal/vehicles/${vehicle._id}`}>Service, checks and history <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link>}
      </div>
      {children && <div className="gc-vehicle-card-tools">{children}</div>}
    </section>
  );
}

export function policyState(policy) {
  if (!policy) return null;
  const days = dayDifference(policy.expiryDate);
  if (policy.status === "ACTIVE" && days != null && days <= 30) return { status: "EXPIRING", label: `Renew by ${dateShort(policy.expiryDate)}` };
  return { status: policy.status };
}

export function PolicySummary({ policy, vehicle, full = false }) {
  const [busy, setBusy] = useState(false);
  const downloadFile = async () => {
    setBusy(true);
    try { await downloadPolicy(policy); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const state = policyState(policy);
  const days = policy ? dayDifference(policy.expiryDate) : null;
  const verification = !policy?.verificationStatus || policy.verificationStatus === "USER_ADDED" ? "Added by you" : label(policy.verificationStatus);
  return (
    <section className="gc-card gc-policy-card" id={policy ? `policy-${policy._id}` : undefined} aria-label={full ? `Policy ${policy?.policyNumber || ""}` : "Policy"}>
      {!full && <SectionHeading title="Policy" to={`/portal/insurance?vehicleId=${vehicle._id}`} action="Policy details" />}
      {policy ? (
        <>
          <div className="gc-policy-title">
            <div>
              <strong>{policy.insurer}</strong>
              <span className="gc-ref">{policy.policyNumber}</span>
            </div>
            <StatusChip status={state.status} kind="policy" label={state.label} />
          </div>
          <Facts items={[
            ["Cover", policy.coverageType],
            ["Valid from", date(policy.startDate)],
            ["Expires", date(policy.expiryDate)],
            full && ["Verification", verification],
          ]} />
          {policy.status === "ACTIVE" && <CoverPeriod policy={policy} days={days} />}
          <div className="gc-policy-foot">
            <span className="gc-note">
              {policy.status === "EXPIRED" ? `Expired ${Math.abs(days)} days ago` : policy.status === "UPCOMING" ? `Cover starts ${date(policy.startDate)}` : policy.status === "INACTIVE" ? "Marked inactive" : full ? null : verification}
            </span>
            {policy.document?.originalName ? (
              <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" onClick={downloadFile} disabled={busy} aria-busy={busy}><Download className="gc-icon gc-icon--sm" aria-hidden="true" />{busy ? "Downloading…" : "Policy file"}</button>
            ) : <span className="gc-note">No policy file uploaded</span>}
          </div>
        </>
      ) : (
        <Empty title="No policy added" description="Add the insurance policy for this vehicle to see cover and renewal dates." action={<Link className="gc-btn gc-btn--secondary gc-btn--sm" to={`/portal/insurance?vehicleId=${vehicle._id}&add=policy`}><Plus className="gc-icon gc-icon--sm" aria-hidden="true" />Add policy</Link>} />
      )}
    </section>
  );
}

// How much of the policy term has run, from its own start and expiry dates.
function CoverPeriod({ policy, days }) {
  const start = new Date(policy.startDate), end = new Date(policy.expiryDate);
  const used = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100)) || 0;
  return (
    <div className="gc-cover">
      <div className="gc-cover-head"><span>Cover period</span><strong>{Math.max(0, days)} days left</strong></div>
      <div className={cx("gc-progress", days <= 30 && "is-ending")} role="img" aria-label={`${Math.round(used)}% of the cover period has passed`}><span style={{ width: `${used}%` }} /></div>
      <div className="gc-cover-scale"><span>{date(policy.startDate)}</span><span>{date(policy.expiryDate)}</span></div>
    </div>
  );
}

// Every claim for one vehicle (from the vehicle-care response): open claims first, then drafts and closed ones, newest first.
export function ClaimSummary({ data, limit = 5 }) {
  const open = activeClaims(data.claims);
  const newest = (a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt);
  const ordered = [...open.sort(newest), ...data.claims.filter((c) => !open.includes(c)).sort(newest)];
  const rows = ordered.slice(0, limit).map((c) => ({ ...c, vehicle: data.vehicle }));
  const drafts = data.claims.filter((c) => c.status === "DRAFT").length;
  const closed = data.claims.length - open.length - drafts;
  const counts = [`${open.length} open`, drafts && `${drafts} draft${drafts === 1 ? "" : "s"}`, closed && `${closed} closed`].filter(Boolean).join(" · ");
  return (
    <section className="gc-card gc-card--flush" id="claims" aria-labelledby="vehicle-claims">
      <div className="gc-card-head">
        <div><h2 id="vehicle-claims">Claims</h2><p>{data.claims.length ? counts : "Nothing filed for this vehicle yet."}</p></div>
        <Link className="gc-btn gc-btn--secondary gc-btn--sm" to={`/portal/claims/new?vehicleId=${data.vehicle._id}`}><Plus className="gc-icon gc-icon--sm" aria-hidden="true" />File a claim</Link>
      </div>
      <div className="gc-card-inset">
        {rows.length ? <ClaimTable claims={rows} label="Claims for this vehicle" hideVehicle /> : (
          <p className="gc-body-text">If this vehicle is damaged in an accident or stolen, file a claim. We’ll tell you what to upload and keep you updated at each stage.</p>
        )}
        {data.claims.length > limit && <Link className="gc-link gc-link--arrow" to={`/portal/claims?vehicleId=${data.vehicle._id}`}>All {data.claims.length} claims for this vehicle <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link>}
      </div>
    </section>
  );
}

export function CareSummary({ data }) {
  const last = data.services.find((item) => new Date(item.serviceDate) <= new Date());
  const next = data.vehicle.nextServiceDueAt;
  const href = `/portal/vehicles/${data.vehicle._id}`;
  const overdue = next && dayDifference(next) < 0;
  return (
    <section className="gc-card" aria-labelledby="care-title">
      <SectionHeading id="care-title" title="Service" to={`${href}#service`} action="Service history" />
      <div className="gc-rows">
        <div className="gc-row-item"><Wrench className="gc-icon" aria-hidden="true" /><div><small className="gc-muted">Last service</small><strong>{last ? last.serviceType : "No service recorded yet"}</strong>{last && <span className="gc-note">{date(last.serviceDate)} · {last.workshop}</span>}</div></div>
        <div className="gc-row-item"><CalendarClock className="gc-icon" aria-hidden="true" /><div><small className="gc-muted">Next service</small><strong>{next ? date(next) : "No date set"}</strong><span className={cx("gc-note", overdue && "gc-text-action")}>{next ? (overdue ? "This date has passed. Book a service or update the date." : "From your service schedule") : "Set a date when you know it"}</span></div></div>
      </div>
      <div className="gc-actions"><Link className="gc-btn gc-btn--secondary gc-btn--sm" to={`${href}?action=service`}>Add a service</Link><Link className="gc-btn gc-btn--quiet gc-btn--sm" to={`${href}?action=reminder`}>Add a reminder</Link></div>
    </section>
  );
}

// `grouped`: the list sits under a heading that already names the category or claim, so rows show dates and review state instead.
export function DocumentList({ documents, limit, emptyAction, grouped = false }) {
  const [busy, setBusy] = useState("");
  const downloadFile = async (doc) => {
    setBusy(doc.id);
    try {
      const { data } = await api.get(doc.downloadPath, { responseType: "blob" });
      const url = URL.createObjectURL(data), anchor = document.createElement("a");
      anchor.href = url; anchor.download = doc.originalName || doc.name; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(""); }
  };
  if (!documents.length) return <Empty icon={FileText} title="No documents yet" description="Policy files, vehicle papers and claim documents for this vehicle will appear here." action={emptyAction} />;
  return (
    <ul className="gc-doc-list">
      {documents.slice(0, limit || documents.length).map((doc) => (
        <li key={doc.id}>
          <FileText className="gc-icon" aria-hidden="true" />
          <div>
            <strong>{doc.category === "Claim" ? docLabel(doc.name) : doc.name}</strong>
            <span className="gc-note">
              {grouped
                ? [["Service", "Policy"].includes(doc.category) && doc.type && doc.type !== doc.name ? doc.type : null, doc.at ? `Added ${date(doc.at)}` : null, doc.expiryDate ? `Expires ${date(doc.expiryDate)}` : null].filter(Boolean).join(" · ")
                : [doc.category, doc.type && doc.type !== doc.name ? doc.type : null, doc.expiryDate ? `Expires ${date(doc.expiryDate)}` : null].filter(Boolean).join(" · ")}
            </span>
          </div>
          {grouped && doc.category === "Claim" && doc.status && <StatusChip status={doc.status} kind="document" />}
          <button type="button" className="gc-btn gc-btn--quiet gc-btn--icon" disabled={Boolean(busy)} aria-busy={busy === doc.id} aria-label={`Download ${doc.name}`} onClick={() => downloadFile(doc)}>
            {busy === doc.id ? <span className="gc-spinner" aria-hidden="true" /> : <Download className="gc-icon" aria-hidden="true" />}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ReminderList({ reminders, vehicle, limit, onChange }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState("");
  const complete = async (row) => {
    setBusy(row.id);
    try { await api.patch(`/vehicles/${vehicle._id}/reminders/${row.recordId}`, { status: "COMPLETED" }); toast.success(`“${row.title}” marked done.`); onChange?.(); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(""); }
  };
  if (!reminders.length) return <Empty icon={CalendarClock} title="Nothing due" description="No reminders are waiting for this vehicle." />;
  return (
    <ul className="gc-reminders">
      {reminders.slice(0, limit || reminders.length).map((row) => (
        <li key={row.id} className={row.due ? "is-due" : undefined}>
          <CalendarClock className="gc-icon" aria-hidden="true" />
          <div>
            <Link to={row.href}><strong>{row.title}</strong></Link>
            <span className="gc-note">
              {row.dueDate ? date(row.dueDate) : row.dueOdometer != null ? `At ${row.dueOdometer.toLocaleString("en-IN")} km` : "When you can"}
              {row.dueOdometer != null && row.dueDate ? ` or ${row.dueOdometer.toLocaleString("en-IN")} km` : ""}
              {row.source && row.source !== "Saved reminder" ? ` · ${row.source}` : ""}
            </span>
          </div>
          <div className="gc-reminder-tools">
            {row.due && <StatusChip status="DUE" kind="reminder" label="Due" family="action" />}
            {row.recordId && onChange && user.emailVerified && (
              <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" disabled={Boolean(busy)} aria-busy={busy === row.id} aria-label={`Mark “${row.title}” done`} onClick={() => complete(row)}>
                <Check className="gc-icon gc-icon--sm" aria-hidden="true" />{busy === row.id ? "Saving…" : "Done"}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

const TIMELINE_TYPE = { CLAIM: "Claim", CLAIM_EVENT: "Claim", SERVICE: "Service", CHECK: "Vehicle check", POLICY: "Policy", DOCUMENT: "Document", ODOMETER: "Odometer", REMINDER: "Reminder" };
export function ActivityTimeline({ timeline, limit = 6 }) {
  if (!timeline.length) return <Empty title="No activity yet" description="Policy, service, check and claim events for this vehicle will appear here." />;
  return (
    <ol className="gc-timeline">
      {timeline.slice(0, limit).map((entry, index) => (
        <li key={`${entry.type}-${entry.item?._id || index}-${entry.at}`}>
          <span className="gc-timeline-dot" aria-hidden="true" />
          <div>
            {entry.href ? <Link to={entry.href}>{describe(entry.title)}</Link> : <strong>{describe(entry.title)}</strong>}
            <span className="gc-note">{dateTime(entry.at)} · {TIMELINE_TYPE[String(entry.type).toUpperCase().replace(/[\s-]/g, "_")] || label(entry.type)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
