import { useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "../services/api";
import { Field } from "./UI";

export const manufacturers = [
  "Maruti Suzuki",
  "Hyundai",
  "Tata",
  "Mahindra",
  "Honda",
  "Toyota",
  "Kia",
  "Renault",
  "Skoda",
  "Volkswagen",
  "MG",
  "Nissan",
  "Ford",
  "Other",
];
export const insurers = [
  "ICICI Lombard",
  "HDFC ERGO",
  "Bajaj Allianz",
  "Tata AIG",
  "New India Assurance",
  "United India Insurance",
  "National Insurance",
  "Oriental Insurance",
  "Reliance General",
  "SBI General",
  "ACKO",
  "Digit",
  "Other",
];

export function VehicleForm({ record = {}, onSaved, onCancel }) {
  const known = manufacturers.includes(record.manufacturer),
    [make, setMake] = useState(known ? record.manufacturer : "Other"),
    [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    body.manufacturer = make === "Other" ? body.customManufacturer : make;
    delete body.customManufacturer;
    try {
      const r = await api[record._id ? "patch" : "post"](
        `/vehicles${record._id ? "/" + record._id : ""}`,
        body,
      );
      toast.success(`Vehicle ${record._id ? "updated" : "added"}.`);
      onSaved(r.data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="gc-form" onSubmit={save}>
      <div className="gc-form-grid">
        <Field label="Manufacturer" required>
          <select value={make} onChange={(e) => setMake(e.target.value)}>
            {manufacturers.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        {make === "Other" && (
          <Field
            label="Manufacturer name"
            name="customManufacturer"
            required
            defaultValue={known ? "" : record.manufacturer}
          />
        )}
        <Field
          label="Model"
          name="model"
          required
          defaultValue={record.model}
        />
        <Field label="Variant" optional name="variant" defaultValue={record.variant} placeholder="For example, XZ Plus" />
        <Field label="Colour" optional hint="The maker’s paint name, such as Atlas White" name="color" defaultValue={record.color} maxLength={80} />
        <Field label="Paint code" optional name="paintCode" defaultValue={record.paintCode} maxLength={40} />
        <Field
          label="Registration number"
          name="registrationNumber"
          required
          defaultValue={record.registrationNumber}
          placeholder="MH 48 AB 4821"
        />
        <Field
          label="Manufacturing year"
          name="manufacturingYear"
          type="number"
          min="1950"
          max={new Date().getFullYear() + 1}
          required
          defaultValue={record.manufacturingYear}
        />
        <Field label="Vehicle type" required>
          <select name="vehicleType" defaultValue={record.vehicleType || "SUV"}>
            {[
              "SUV",
              "Hatchback",
              "Sedan",
              "MUV",
              "Coupe",
              "Pickup",
              "Motorcycle",
              "Other",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Fuel type" required>
          <select name="fuelType" defaultValue={record.fuelType || "Petrol"}>
            {["Petrol", "Diesel", "CNG", "Electric", "Hybrid", "Other"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </Field>
        <Field
          label="Chassis number"
          name="chassisNumber"
          required
          defaultValue={record.chassisNumber}
        />
        <Field
          label="Engine number"
          name="engineNumber"
          required
          defaultValue={record.engineNumber}
        />
        <Field label="Odometer reading (km)" optional name="currentOdometer" type="number" min="0" defaultValue={record.currentOdometer} />
        <Field label="Service every (km)" optional name="serviceIntervalKm" type="number" min="1000" defaultValue={record.serviceIntervalKm || 10000} />
        <Field label="Service every (months)" optional name="serviceIntervalMonths" type="number" min="1" max="60" defaultValue={record.serviceIntervalMonths || 12} />
        <Field label="Next service due" optional name="nextServiceDueAt" type="date" defaultValue={record.nextServiceDueAt?.slice(0, 10)} />
      </div>
      <div className="gc-form-actions">
        <button className="gc-btn" disabled={busy} aria-busy={busy}>
          {busy ? "Saving…" : "Save vehicle"}
        </button>
        <button type="button" className="gc-btn gc-btn--secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function PolicyForm({ vehicleId, record = {}, onSaved, onCancel }) {
  const known = insurers.includes(record.insurer),
    [company, setCompany] = useState(known ? record.insurer : "Other"),
    [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget),
      file = form.get("document"),
      body = Object.fromEntries(form);
    body.vehicle = vehicleId || body.vehicle;
    body.insurer = company === "Other" ? body.customInsurer : company;
    body.claimTypes = form.getAll("claimTypes");
    body.active = body.active === "true";
    body.cashlessGarageAvailable = body.cashlessGarageAvailable === "on";
    delete body.customInsurer;
    delete body.document;
    try {
      if (new Date(body.expiryDate) < new Date(body.startDate))
        throw new Error("Expiry date cannot be earlier than the start date.");
      const r = await api[record._id ? "patch" : "post"](
        `/policies${record._id ? "/" + record._id : ""}`,
        { ...body, insuredDeclaredValue: Math.round(Number(body.insuredDeclaredValue) * 100), deductible: Math.round(Number(body.deductible) * 100) },
      );
      if (file?.size) {
        const upload = new FormData();
        upload.append("file", file);
        await api.post(`/policies/${r.data._id}/document`, upload);
      }
      toast.success(`Policy ${record._id ? "updated" : "added"}.`);
      onSaved(r.data);
    } catch (err) {
      toast.error(err.response ? errorMessage(err) : err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="gc-form" onSubmit={save}>
      <div className="gc-form-grid">
        {!vehicleId && (
          <Field label="Vehicle" required>
            <select name="vehicle" defaultValue={record.vehicle || ""} required>
              <option value="">Choose a vehicle</option>
            </select>
          </Field>
        )}
        <Field
          label="Policy number"
          name="policyNumber"
          required
          defaultValue={record.policyNumber}
        />
        <Field label="Insurance company" required>
          <select value={company} onChange={(e) => setCompany(e.target.value)}>
            {insurers.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        {company === "Other" && (
          <Field
            label="Insurance company name"
            name="customInsurer"
            required
            defaultValue={known ? "" : record.insurer}
          />
        )}
        <Field label="Coverage type" required>
          <select
            name="coverageType"
            defaultValue={record.coverageType || "Comprehensive"}
          >
            {["Comprehensive", "Third-party", "Own damage"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field
          label="Policy start date"
          name="startDate"
          type="date"
          required
          defaultValue={record.startDate?.slice(0, 10)}
        />
        <Field
          label="Policy expiry date"
          name="expiryDate"
          type="date"
          required
          defaultValue={record.expiryDate?.slice(0, 10)}
        />
        <Field
          label="Insured declared value, IDV (₹)"
          name="insuredDeclaredValue"
          type="number"
          min="0"
          required
          step="0.01"
          defaultValue={(record.insuredDeclaredValue ?? 0) / 100}
        />
        <Field
          label="Deductible (₹)"
          name="deductible"
          type="number"
          min="0"
          required
          step="0.01"
          defaultValue={(record.deductible ?? 0) / 100}
        />
        <Field label="Policy status">
          <select name="active" defaultValue={String(record.active ?? true)}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </Field>
        <Field label="Policy file" optional hint="JPG, PNG or PDF, up to 8 MB">
          <input name="document" type="file" accept=".jpg,.jpeg,.png,.pdf" />
        </Field>
      </div>
      <fieldset className="gc-fieldset">
        <legend>How claims can be paid</legend>
        {["Cashless", "Reimbursement"].map((v) => (
          <label className="gc-check" key={v}>
            <input
              name="claimTypes"
              value={v}
              type="checkbox"
              defaultChecked={
                !record.claimTypes || record.claimTypes.includes(v)
              }
            />
            {v}
          </label>
        ))}
      </fieldset>
      <label className="gc-check">
        <input
          name="cashlessGarageAvailable"
          type="checkbox"
          defaultChecked={record.cashlessGarageAvailable}
        />
        This policy has cashless network garages
      </label>
      <div className="gc-form-actions">
        <button className="gc-btn" disabled={busy} aria-busy={busy}>
          {busy ? "Saving…" : "Save policy"}
        </button>
        <button type="button" className="gc-btn gc-btn--secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
