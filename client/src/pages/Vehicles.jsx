import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Car, Download, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { api, errorMessage, downloadPolicy } from "../services/api";
import { Confirm, Empty, ErrorState, Loading, PageHeader, Plate, StatusChip, plateType } from "../components/UI";
import { VehicleForm, PolicyForm } from "../components/VehiclePolicyForms";
import { date, money } from "../utils/format";
import { dayDifference } from "../utils/vehicleWorkspace";
import Pagination from "../components/Pagination";
import VehicleImage, { VehiclePhotoUpload } from "../components/VehicleImage";

const policyStatus = (p) => (new Date(p.expiryDate) < new Date() ? "EXPIRED" : new Date(p.startDate) > new Date() ? "UPCOMING" : !p.active ? "INACTIVE" : "ACTIVE");

export default function Vehicles() {
  const [params] = useSearchParams();
  const [page, setPage] = useState(1);
  const vehicles = useApi(`/vehicles?page=${page}&limit=12&includePolicies=true`);
  const [form, setForm] = useState(params.get("add") === "vehicle" ? { type: "vehicle", record: {} } : null);
  const reload = () => { vehicles.reload(); setForm(null); };
  const remove = async (type, id) => {
    try {
      const r = await api.delete(`/${type}/${id}`);
      toast.success(r.data.message);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };
  if (vehicles.loading) return <Loading label="Loading your vehicles…" />;
  if (vehicles.error && !vehicles.data) return <ErrorState message={vehicles.error} retry={reload} />;
  const items = vehicles.data.items || [];
  const openForm = (next) => { setForm(next); requestAnimationFrame(() => document.getElementById("vehicle-form")?.scrollIntoView({ behavior: "smooth", block: "start" })); };
  return (
    <div className="gc-next-vehicles">
      <PageHeader
        visual="vehicle"
        title="Vehicles"
        description="Each vehicle with its policies. Open a vehicle for service records, checks and documents."
        action={!form && items.length > 0 && <button type="button" className="gc-btn" onClick={() => openForm({ type: "vehicle", record: {} })}><Plus className="gc-icon" aria-hidden="true" />Add a vehicle</button>}
      />
      {form && (
        <section className="gc-card" id="vehicle-form" aria-labelledby="vehicle-form-title">
          <div className="gc-card-head"><h2 id="vehicle-form-title">{form.record?._id ? "Edit" : "Add"} {form.type === "vehicle" ? "vehicle" : "policy"}</h2></div>
          {form.type === "vehicle"
            ? <VehicleForm record={form.record} onSaved={reload} onCancel={() => setForm(null)} />
            : <PolicyForm vehicleId={form.vehicleId} record={form.record} onSaved={reload} onCancel={() => setForm(null)} />}
        </section>
      )}
      {!items.length && !form ? (
        <Empty level={2} icon={Car} title="You haven’t added a vehicle" description="Add your vehicle and its insurance policy to file a claim and keep its records together." action={<button type="button" className="gc-btn" onClick={() => openForm({ type: "vehicle", record: {} })}><Plus className="gc-icon" aria-hidden="true" />Add a vehicle</button>} />
      ) : (
        <div className="gc-grid-2">
          {items.map((v) => {
            const linked = v.policies || [];
            const eligible = linked.some((p) => policyStatus(p) === "ACTIVE");
            return (
              <article className="gc-card gc-vehicle-tile" key={v._id} aria-labelledby={`v-${v._id}`}>
                <VehicleImage vehicle={v} size="card" />
                <div className="gc-vehicle-tile-head">
                  <div>
                    <h2 id={`v-${v._id}`}>{v.manufacturer} {v.model}{v.variant ? ` ${v.variant}` : ""}</h2>
                    <p className="gc-muted">{[v.manufacturingYear, v.color, v.vehicleType, v.fuelType].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Plate registration={v.registrationNumber} type={plateType(v)} />
                </div>
                <VehiclePhotoUpload vehicle={v} onSaved={vehicles.reload} />
                <div className="gc-vehicle-tile-section">
                  <div className="gc-card-head"><h3>Policies</h3><button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={() => openForm({ type: "policy", vehicleId: v._id, record: {} })}><Plus className="gc-icon gc-icon--sm" aria-hidden="true" />Add policy</button></div>
                  {linked.length ? (
                    <ul className="gc-record-list">
                      {linked.map((p) => {
                        const state = policyStatus(p), days = dayDifference(p.expiryDate);
                        return (
                          <li key={p._id}>
                            <div className="gc-record-head"><strong>{p.insurer}</strong><StatusChip status={state} kind="policy" /></div>
                            <p className="gc-note"><span className="gc-ref">{p.policyNumber}</span> · {p.coverageType} · {date(p.startDate)} to {date(p.expiryDate)}</p>
                            <p className="gc-note">IDV {money(p.insuredDeclaredValue)} · deductible {money(p.deductible)} · {state === "EXPIRED" ? `expired ${Math.abs(days)} days ago` : state === "UPCOMING" ? `starts ${date(p.startDate)}` : `${Math.max(0, days)} days left`}</p>
                            <div className="gc-actions">
                              {p.document?.originalName && <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={() => downloadPolicy(p).catch((e) => toast.error(errorMessage(e)))}><Download className="gc-icon gc-icon--sm" aria-hidden="true" />Policy file</button>}
                              <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={() => openForm({ type: "policy", vehicleId: v._id, record: p })}><Pencil className="gc-icon gc-icon--sm" aria-hidden="true" />Edit<span className="gc-sr"> policy {p.policyNumber}</span></button>
                              <Confirm title={`Remove policy ${p.policyNumber}?`} description="A policy that has claims is archived so its claim history stays available. Otherwise it’s deleted." confirmLabel="Remove policy" onConfirm={() => remove("policies", p._id)}>
                                {(open) => <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm gc-danger-text" onClick={open}><Trash2 className="gc-icon gc-icon--sm" aria-hidden="true" />Remove<span className="gc-sr"> policy {p.policyNumber}</span></button>}
                              </Confirm>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : <p className="gc-body-text">No policy yet. Add one to file a claim for this vehicle.</p>}
                </div>
                <div className="gc-vehicle-tile-foot">
                  <Link className="gc-btn gc-btn--secondary gc-btn--sm" to={`/portal/vehicles/${v._id}`}><Wrench className="gc-icon gc-icon--sm" aria-hidden="true" />Service and history</Link>
                  {eligible && <Link className="gc-btn gc-btn--sm" to={`/portal/claims/new?vehicleId=${v._id}`}>File a claim</Link>}
                  <span className="gc-spacer" />
                  <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={() => openForm({ type: "vehicle", record: v })}><Pencil className="gc-icon gc-icon--sm" aria-hidden="true" />Edit<span className="gc-sr"> {v.registrationNumber}</span></button>
                  <Confirm title={`Remove ${v.manufacturer} ${v.model}?`} description="A vehicle with policies or claims is archived so its records stay available. Otherwise it’s deleted." confirmLabel="Remove vehicle" onConfirm={() => remove("vehicles", v._id)}>
                    {(open) => <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm gc-danger-text" onClick={open}><Trash2 className="gc-icon gc-icon--sm" aria-hidden="true" />Remove<span className="gc-sr"> {v.registrationNumber}</span></button>}
                  </Confirm>
                </div>
              </article>
            );
          })}
          {items.length % 2 === 1 && !form && (
            <button type="button" className="gc-add-tile" onClick={() => openForm({ type: "vehicle", record: {} })}>
              <Plus className="gc-icon" aria-hidden="true" />
              <strong>Add another vehicle</strong>
              <span>Keep each vehicle’s policy, service records and claims in one place.</span>
            </button>
          )}
        </div>
      )}
      <Pagination data={vehicles.data} noun="vehicles" onPage={setPage} />
    </div>
  );
}
