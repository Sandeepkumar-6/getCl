import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CalendarClock, Download, Gauge, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { api, downloadPath, errorMessage } from "../services/api";
import { Alert, Confirm, Empty, ErrorState, Field, Loading, PageHeader, Plate, StatusChip, cx, plateType } from "../components/UI";
import { date, label, money } from "../utils/format";
import { VehiclePhotoUpload, VehicleAppearanceForm } from "../components/VehicleImage";
import { useAuth } from "../context/AuthContext";
import { usePortalCrumb } from "../layouts/PortalLayout";
import { ActivityTimeline, ClaimSummary, PolicySummary, ReminderList, SectionHeading, VehicleIdentity } from "../components/VehicleOverviewPanels";
import { currentPolicy, dayDifference, vehicleReminders } from "../utils/vehicleWorkspace";

const CHECK_ITEMS = [["tyres", "Tyres"], ["brakes", "Brakes"], ["lights", "Lights"], ["fluids", "Fluids"], ["exterior", "Body and glass"]];
const CHECK_STATE = { OK: { label: "OK", family: "positive" }, NEEDS_ATTENTION: { label: "Needs attention", family: "action" }, NOT_CHECKED: { label: "Not checked", family: "neutral" } };
const CHECK_OPTIONS = [["NOT_CHECKED", "Not checked"], ["OK", "OK"], ["NEEDS_ATTENTION", "Needs attention"]];
const REMINDER_TYPES = [["SERVICE", "Service"], ["PUC", "PUC certificate"], ["INSURANCE_RENEWAL", "Insurance renewal"], ["DOCUMENT_EXPIRY", "Document expiry"], ["BATTERY_CHECK", "Battery check"], ["TYRE_CHECK", "Tyre check"], ["CUSTOM", "Something else"]];
const DOC_TYPES = [["RC", "Registration certificate (RC)"], ["PUC", "PUC certificate"], ["INSURANCE", "Insurance"], ["SERVICE_INVOICE", "Service invoice"], ["OTHER", "Other"]];
const DOC_LABEL = Object.fromEntries(DOC_TYPES);
const FORM_TITLE = { service: "Add a service", check: "Record a monthly check", reminder: "Add a reminder", mileage: "Update the odometer", document: "Upload a vehicle document" };

export default function VehicleCare({ vehicleId, embedded = false }) {
  const { id: routeId } = useParams();
  const id = vehicleId || routeId;
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const result = useApi(`/vehicles/${id}/care`);
  const [form, setForm] = useState(["service", "check", "reminder", "mileage", "document"].includes(params.get("action")) ? params.get("action") : "");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [allServices, setAllServices] = useState(false);
  const modalRef = useRef(null);
  const v = result.data?.vehicle;
  usePortalCrumb(v ? `${v.manufacturer} ${v.model}` : "");
  useEffect(() => {
    if (!form || result.loading) return;
    const previous = document.activeElement;
    (modalRef.current?.querySelector("input, select, textarea") || modalRef.current)?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [form, result.loading]);
  useEffect(() => {
    if (result.loading || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [result.loading]);
  const closeForm = () => { setForm(""); const next = new URLSearchParams(params); next.delete("action"); setParams(next, { replace: true }); };
  if (result.loading) return <Loading label="Loading vehicle details…" />;
  if (result.error && !result.data) return <ErrorState message={result.error} retry={result.reload} />;
  const { vehicle, services, checks, policies, documents = [], timeline } = result.data;
  const verified = user.emailVerified;
  const serviceOverdue = vehicle.nextServiceDueAt && dayDifference(vehicle.nextServiceDueAt) < 0;
  const latestCheck = checks[0];
  const attention = latestCheck ? CHECK_ITEMS.filter(([key]) => latestCheck[key] === "NEEDS_ATTENTION").map(([, name]) => name) : [];
  const submit = async (event, path, transform = (value) => value, done = "Saved.") => {
    event.preventDefault();
    setBusy(true);
    try {
      const raw = Object.fromEntries(new FormData(event.currentTarget));
      const attachment = raw.attachment;
      delete raw.attachment;
      const body = transform(raw);
      const response = await api.post(`/vehicles/${id}/${path}`, body);
      if (path === "services" && attachment?.size) {
        const upload = new FormData();
        upload.append("file", attachment);
        try { await api.post(`/vehicles/${id}/services/${response.data._id}/documents`, upload); }
        catch (error) {
          toast.error(`The service was saved, but the invoice didn’t upload: ${errorMessage(error)} Upload it from Vehicle documents.`);
          closeForm(); result.reload(); return;
        }
      }
      toast.success(done);
      closeForm();
      result.reload();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const saveSimpleForm = async (event, save, success) => {
    event.preventDefault();
    setBusy(true);
    try {
      await save(new FormData(event.currentTarget));
      toast.success(success);
      closeForm();
      result.reload();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const updateMileage = (event) => saveSimpleForm(event,
    (data) => api.patch(`/vehicles/${id}/odometer`, { currentOdometer: Number(data.get("currentOdometer")) }),
    "Odometer updated.");
  const uploadDocument = (event) => saveSimpleForm(event,
    (data) => api.post(`/vehicles/${id}/documents`, data),
    "Document uploaded.");
  const deleteDocument = async (documentId) => {
    try { await api.delete(`/vehicles/${id}/documents/${documentId}`); toast.success("Document removed."); result.reload(); }
    catch (error) { toast.error(errorMessage(error)); throw error; }
  };
  const addButton = (kind, text, Icon = Plus) => verified
    ? <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" onClick={() => setForm(kind)}><Icon className="gc-icon gc-icon--sm" aria-hidden="true" />{text}</button>
    : null;

  return (
    <div className="gc-stack-lg">
      {!embedded && (
        <PageHeader
          visual="vehicle"
          title={`${vehicle.manufacturer} ${vehicle.model}`}
          meta={<><Plate registration={vehicle.registrationNumber} type={plateType(vehicle)} /><StatusChip status={vehicle.verificationStatus || "USER_ADDED"} kind="vehicle" /></>}
          description="Service records, checks, documents, reminders and claims for this vehicle."
        />
      )}
      <div className="gc-grid-2 gc-grid-vehicle">
        <VehicleIdentity data={result.data} link={false}>
          {verified && addButton("mileage", "Update odometer", Gauge)}
          {user.role === "POLICYHOLDER" && <VehiclePhotoUpload vehicle={vehicle} onSaved={result.reload} />}
          {user.role === "POLICYHOLDER" && <VehicleAppearanceForm vehicle={vehicle} onSaved={result.reload} />}
        </VehicleIdentity>
        <PolicySummary policy={currentPolicy(policies)} vehicle={vehicle} />
      </div>
      <ClaimSummary data={result.data} />
      <div className="gc-grid-2">
        <section className="gc-card" id="service" aria-labelledby="service-title">
          <div className="gc-card-head"><div><h2 id="service-title">Service history</h2><p>Workshop visits and invoices</p></div>{addButton("service", "Add a service")}</div>
          <div className="gc-row-item gc-next-service">
            <CalendarClock className="gc-icon" aria-hidden="true" />
            <div>
              <small className="gc-muted">Next service</small>
              <strong>{vehicle.nextServiceDueAt ? date(vehicle.nextServiceDueAt) : "No date set"}</strong>
              <span className={cx("gc-note", serviceOverdue && "gc-text-action")}>{serviceOverdue ? "This date has passed. Book a service or add the visit below." : vehicle.serviceIntervalKm ? `Every ${vehicle.serviceIntervalKm.toLocaleString("en-IN")} km` : "Set when you add a service"}</span>
            </div>
          </div>
          {services.length ? (
            <ol className="gc-timeline">
              {services.slice(0, allServices ? services.length : 4).map((s) => (
                <li key={s._id}>
                  <span className="gc-timeline-dot" aria-hidden="true" />
                  <div>
                    <strong>{s.serviceType}</strong>
                    <span className="gc-note">{[date(s.serviceDate), s.workshop, s.odometer != null ? `${s.odometer.toLocaleString("en-IN")} km` : null, s.amount ? money(s.amount) : null].filter(Boolean).join(" · ")}</span>
                    {s.notes && <p>{s.notes}</p>}
                    {s.documents?.map((d) => <button key={d._id} type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={() => downloadPath(`/vehicles/${id}/services/${s._id}/documents/${d._id}`, d.originalName).catch((e) => toast.error(errorMessage(e)))}><Download className="gc-icon gc-icon--sm" aria-hidden="true" />{d.originalName}</button>)}
                  </div>
                </li>
              ))}
            </ol>
          ) : <Empty title="No services recorded" description="Add your last workshop visit to start the history." />}
          {services.length > 4 && <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={() => setAllServices(!allServices)}>{allServices ? "Show the latest 4" : `Show all ${services.length} services`}</button>}
        </section>
        <section className="gc-card" aria-labelledby="check-title">
          <div className="gc-card-head"><div><h2 id="check-title">Monthly check</h2><p>What you can see yourself. Not a mechanic’s inspection.</p></div>{addButton("check", "Record a check")}</div>
          {latestCheck ? (
            <div className="gc-stack">
              <p className="gc-body-text">
                Last checked {date(latestCheck.checkedAt)}{latestCheck.odometer != null ? ` at ${latestCheck.odometer.toLocaleString("en-IN")} km` : ""}.
                {attention.length ? ` ${attention.length} item${attention.length === 1 ? "" : "s"} marked for attention.` : ""}
              </p>
              <ul className="gc-check-list" aria-label="Latest check">
                {CHECK_ITEMS.map(([key, name]) => {
                  const state = CHECK_STATE[latestCheck[key]] || CHECK_STATE.NOT_CHECKED;
                  return <li key={key}><span>{name}</span><StatusChip status={latestCheck[key] || "NOT_CHECKED"} kind="check" family={state.family} label={state.label} /></li>;
                })}
              </ul>
              {latestCheck.notes && <p className="gc-note">Your note: {latestCheck.notes}</p>}
            </div>
          ) : <Empty title="No check recorded yet" description="Once a month, look at tyres, brakes, lights, fluids and the body." />}
        </section>
      </div>
      <div className="gc-grid-2">
        <section className="gc-card" id="documents" aria-labelledby="vdocs-title">
          <div className="gc-card-head"><div><h2 id="vdocs-title">Vehicle documents</h2><p>RC, PUC, insurance and service papers</p></div>{addButton("document", "Upload", Upload)}</div>
          {documents.length ? (
            <ul className="gc-doc-list">
              {documents.map((d) => (
                <li key={d._id}>
                  <span className="gc-doc-type">{DOC_LABEL[d.documentType] || label(d.documentType)}</span>
                  <div>
                    <strong>{d.title}</strong>
                    <span className="gc-note">{d.expiryDate ? (d.daysRemaining != null && d.daysRemaining < 0 ? `Expired ${Math.abs(d.daysRemaining)} days ago` : `Expires ${date(d.expiryDate)}${d.daysRemaining != null ? ` · ${d.daysRemaining} days left` : ""}`) : "No expiry date"}</span>
                  </div>
                  {d.status && <StatusChip status={d.status} kind="vehicle-document" />}
                  <div className="gc-file-actions">
                    <button type="button" className="gc-btn gc-btn--quiet gc-btn--icon gc-btn--sm" aria-label={`Download ${d.title}`} onClick={() => downloadPath(`/vehicles/${id}/documents/${d._id}`, d.originalName).catch((e) => toast.error(errorMessage(e)))}><Download className="gc-icon gc-icon--sm" aria-hidden="true" /></button>
                    {verified && (
                      <Confirm title={`Delete ${d.title}?`} description="The file is removed from this vehicle’s records." confirmLabel="Delete document" onConfirm={() => deleteDocument(d._id)}>
                        {(open) => <button type="button" className="gc-btn gc-btn--quiet gc-btn--icon gc-btn--sm gc-danger-icon" aria-label={`Delete ${d.title}`} onClick={open}><Trash2 className="gc-icon gc-icon--sm" aria-hidden="true" /></button>}
                      </Confirm>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : <Empty title="No vehicle documents" description="Upload the RC, PUC, insurance or service papers." />}
          <Link className="gc-link gc-link--arrow" to={`/portal/documents?vehicleId=${id}`}>All policy, claim and vehicle documents</Link>
        </section>
        <section className="gc-card" id="reminders" aria-labelledby="rem-title">
          <div className="gc-card-head"><div><h2 id="rem-title">Reminders</h2><p>Upcoming things to do for this vehicle</p></div>{addButton("reminder", "Add a reminder")}</div>
          <ReminderList reminders={vehicleReminders(result.data)} vehicle={vehicle} onChange={result.reload} />
        </section>
      </div>
      <section className="gc-card" id="timeline" aria-labelledby="timeline-title">
        <SectionHeading id="timeline-title" title="Vehicle history" />
        <ActivityTimeline timeline={timeline} limit={expanded ? timeline.length : 8} />
        {timeline.length > 8 && <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={() => setExpanded(!expanded)}>{expanded ? "Show recent events only" : `Show all ${timeline.length} events`}</button>}
      </section>
      {form && (
        <div className="gc-modal" role="presentation" onKeyDown={(event) => {
          if (event.key === "Escape" && !busy) closeForm();
          if (event.key === "Tab") {
            const controls = [...modalRef.current.querySelectorAll("input, select, button, textarea, a[href]")].filter((el) => !el.matches(":disabled"));
            const first = controls[0], last = controls.at(-1);
            if (!first) event.preventDefault();
            else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }}>
          <section ref={modalRef} tabIndex={-1} className="gc-dialog gc-dialog--wide" role="dialog" aria-modal="true" aria-busy={busy} aria-labelledby="vehicle-form-title">
            <button type="button" className="gc-btn gc-btn--quiet gc-btn--icon gc-dialog-close" aria-label="Close" disabled={busy} onClick={closeForm}><X className="gc-icon" aria-hidden="true" /></button>
            <h2 id="vehicle-form-title">{FORM_TITLE[form]}</h2>
            {!verified && <Alert tone="warning" title="Verify your email first">You can save vehicle records once your email is verified.</Alert>}
            <fieldset disabled={busy || !verified} className="gc-form">
              {form === "service" && (
                <form className="gc-form" onSubmit={(e) => submit(e, "services", (b) => ({ ...b, odometer: Number(b.odometer), amount: Math.round(Number(b.amount || 0) * 100), parts: b.parts ? b.parts.split(",").map((x) => x.trim()).filter(Boolean) : [] }), "Service added.")}>
                  <div className="gc-form-grid">
                    <Field label="Service date" name="serviceDate" type="date" required max={new Date().toLocaleDateString("en-CA")} />
                    <Field label="Odometer (km)" name="odometer" type="number" min={vehicle.currentOdometer || 0} required />
                    <Field label="Type of service" hint="For example, general service" name="serviceType" required />
                    <Field label="Workshop" name="workshop" required />
                    <Field label="Amount paid (₹)" optional name="amount" type="number" min="0" step="0.01" />
                    <Field label="Next service due" optional name="nextServiceDue" type="date" />
                    <Field label="Parts replaced" optional hint="Separate with commas" name="parts" />
                    <Field label="Invoice" optional hint="JPG, PNG or PDF"><input name="attachment" type="file" accept=".jpg,.jpeg,.png,.pdf" /></Field>
                  </div>
                  <Field label="Notes" optional name="notes" />
                  <FormActions close={closeForm} label="Save service" />
                </form>
              )}
              {form === "check" && (
                <form className="gc-form" onSubmit={(e) => submit(e, "checks", (b) => ({ ...b, odometer: b.odometer ? Number(b.odometer) : undefined }), "Check recorded.")}>
                  <div className="gc-form-grid">
                    <Field label="Date checked" name="checkedAt" type="date" defaultValue={new Date().toLocaleDateString("en-CA")} />
                    <Field label="Odometer (km)" optional name="odometer" type="number" min="0" />
                    {CHECK_ITEMS.map(([key, name]) => <Field label={name} key={key}><select name={key} defaultValue="NOT_CHECKED">{CHECK_OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field>)}
                  </div>
                  <Field label="Notes" optional name="notes" />
                  <FormActions close={closeForm} label="Save check" />
                </form>
              )}
              {form === "reminder" && (
                <form className="gc-form" onSubmit={(e) => submit(e, "reminders", (b) => ({ ...b, dueOdometer: b.dueOdometer ? Number(b.dueOdometer) : undefined }), "Reminder added.")}>
                  <div className="gc-form-grid">
                    <Field label="Type"><select name="type">{REMINDER_TYPES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field>
                    <Field label="What to do" hint="For example, renew the PUC certificate" name="title" required minLength={2} />
                  </div>
                  <p className="gc-note">Give a due date, an odometer reading, or both.</p>
                  <div className="gc-form-grid">
                    <Field label="Due date" optional name="dueDate" type="date" />
                    <Field label="Due at (km)" optional name="dueOdometer" type="number" min="0" />
                  </div>
                  <FormActions close={closeForm} label="Save reminder" />
                </form>
              )}
              {form === "mileage" && (
                <form className="gc-form" onSubmit={updateMileage}>
                  <Field label="Odometer reading (km)" hint={`Can’t be lower than the last reading${vehicle.currentOdometer != null ? ` (${vehicle.currentOdometer.toLocaleString("en-IN")} km)` : ""}`} name="currentOdometer" type="number" min={vehicle.currentOdometer || 0} defaultValue={vehicle.currentOdometer} required />
                  <FormActions close={closeForm} label="Save reading" />
                </form>
              )}
              {form === "document" && (
                <form className="gc-form" onSubmit={uploadDocument}>
                  <div className="gc-form-grid">
                    <Field label="Type of document"><select name="documentType">{DOC_TYPES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field>
                    <Field label="Name" hint="For example, PUC 2026" name="title" required minLength={2} />
                    <Field label="Expiry date" optional name="expiryDate" type="date" />
                    <Field label="File" hint="JPG, PNG or PDF, up to 8 MB"><input name="file" type="file" accept=".jpg,.jpeg,.png,.pdf" required /></Field>
                  </div>
                  <FormActions close={closeForm} label="Upload document" />
                </form>
              )}
            </fieldset>
            {busy && <p role="status" className="gc-note">Saving…</p>}
          </section>
        </div>
      )}
    </div>
  );
}

function FormActions({ close, label: text = "Save" }) {
  return <div className="gc-dialog-actions"><button type="button" className="gc-btn gc-btn--secondary" onClick={close}>Cancel</button><button className="gc-btn">{text}</button></div>;
}

