import { useState } from "react";
import { Check, Clock3, Download, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage, download } from "../services/api";
import { documentTypes, photoTypes, dateShort } from "../utils/format";
import { Confirm, Field, StatusChip, cx } from "./UI";
import { docLabel } from "./ClaimReadiness";

const HINTS = {
  "Registration Certificate": "Front and back, with every detail readable",
  "Driving licence": "Of the person who was driving",
  "Insurance policy": "The page with the policy number and dates",
  "Front damage photograph": "From about 2 metres in daylight, number plate visible",
  "FIR or police report": "Or the police diary entry",
  "Keys and theft declaration": "A photo of all keys and your signed declaration",
  "Untraced police report": "The final report from the police",
  "RTO transfer or cancellation papers": "Forms from the RTO for the stolen vehicle",
  "Legal or MACT notice": "Any notice you received from the other party or tribunal",
  "Repair estimate": "The garage’s estimate, if you have one",
};
const MAX = 8 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "application/pdf"];

function slotState(docs) {
  if (!docs.length) return "missing";
  const latest = docs[docs.length - 1];
  if (latest.verificationStatus === "REJECTED") return "rejected";
  if (docs.some((d) => d.verificationStatus === "PENDING")) return "checking";
  return "verified";
}
const MARK = { verified: Check, checking: Clock3, rejected: X };

// The document checklist for a claim: a slot per required document, then photos and other files.
export default function Evidence({ claimId, documents = [], required = [], editable = false, reviewable = false, onChange }) {
  const [busy, setBusy] = useState("");
  const [otherType, setOtherType] = useState("Repair estimate");

  const upload = async (type, fileList) => {
    const files = [...(fileList || [])];
    if (!files.length) return;
    if (!claimId) return toast.error("Save your claim before adding documents.");
    const bad = files.find((f) => !OK_TYPES.includes(f.type) || f.size > MAX);
    if (bad) return toast.error(`${bad.name} can’t be added. Use a JPG, PNG or PDF file up to 8 MB.`);
    setBusy(type);
    try {
      for (const file of files) {
        const data = new FormData();
        data.append("file", file);
        data.append("documentType", type);
        await api.post(`/claims/${claimId}/documents`, data);
      }
      toast.success(files.length > 1 ? `${files.length} files added to ${docLabel(type)}.` : `${docLabel(type)} added.`);
      onChange?.();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  };
  const remove = async (d) => {
    try {
      await api.delete(`/claims/${claimId}/documents/${d._id}`);
      toast.success(`${d.originalName} removed.`);
      onChange?.();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };
  const verify = async (d, status, reason = "") => {
    try {
      await api.patch(`/claims/${claimId}/documents/${d._id}/verify`, { verificationStatus: status, rejectionReason: reason });
      toast.success(status === "ACCEPTED" ? `${docLabel(d.documentType)} marked as checked.` : `${docLabel(d.documentType)} sent back to the policyholder.`);
      onChange?.();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };

  const slotTypes = [...required, ...photoTypes.filter((t) => !required.includes(t))];
  const others = documents.filter((d) => !slotTypes.includes(d.documentType));

  const uploadButton = ({ type, label, primary }) => (
    <label className={cx("gc-btn gc-btn--sm gc-upload", !primary && "gc-btn--secondary")} aria-busy={busy === type}>
      {busy === type ? <span className="gc-spinner" aria-hidden="true" /> : <Upload className="gc-icon gc-icon--sm" aria-hidden="true" />}
      {busy === type ? "Uploading…" : label}
      <input className="gc-sr" type="file" multiple accept=".jpg,.jpeg,.png,.pdf" disabled={Boolean(busy)} aria-label={`${label}: ${docLabel(type)}`} onChange={(e) => { upload(type, e.target.files); e.target.value = ""; }} />
    </label>
  );

  const fileRow = (d, title) => (
    <li key={d._id}>
      <span className="gc-file-name">{title || d.originalName}</span>
      <span className="gc-note">{Math.max(1, Math.round((d.fileSize || 0) / 1024))} KB{d.createdAt ? ` · added ${dateShort(d.createdAt)}` : ""}</span>
      <StatusChip status={d.verificationStatus} kind="document" />
      {d.rejectionReason && <p className="gc-file-reason">{d.rejectionReason}</p>}
      <span className="gc-file-actions">
        <button type="button" className="gc-btn gc-btn--quiet gc-btn--icon gc-btn--sm" aria-label={`Download ${d.originalName}`} onClick={() => download(claimId, d).catch((e) => toast.error(errorMessage(e)))}><Download className="gc-icon gc-icon--sm" aria-hidden="true" /></button>
        {editable && (
          <Confirm title={`Remove ${d.originalName}?`} description="The file will be removed from this claim. You can upload it again later." confirmLabel="Remove file" onConfirm={() => remove(d)}>
            {(open) => <button type="button" className="gc-btn gc-btn--quiet gc-btn--icon gc-btn--sm gc-danger-icon" aria-label={`Remove ${d.originalName}`} onClick={open}><Trash2 className="gc-icon gc-icon--sm" aria-hidden="true" /></button>}
          </Confirm>
        )}
        {reviewable && d.verificationStatus === "PENDING" && (
          <>
            <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" onClick={() => verify(d, "ACCEPTED").catch(() => {})}>Mark checked</button>
            <Confirm title={`Ask for a new ${docLabel(d.documentType).toLowerCase()}?`} description="The policyholder sees your reason and can upload a replacement." confirmLabel="Send back" reason={{ label: "What needs to change?", hint: "For example: the number plate isn’t readable", minLength: 5 }} onConfirm={(reason) => verify(d, "REJECTED", reason)}>
              {(open) => <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={open}>Send back</button>}
            </Confirm>
          </>
        )}
      </span>
    </li>
  );

  return (
    <div className="gc-stack-lg">
      <section className="gc-evidence" aria-labelledby="evidence-required">
        <div className="gc-evidence-head">
          <h3 id="evidence-required">Documents and photos</h3>
          <span className="gc-note">{required.filter((t) => documents.some((d) => d.documentType === t && d.verificationStatus !== "REJECTED")).length} of {required.length} required received</span>
        </div>
        <ul className="gc-slots">
          {slotTypes.map((type) => {
            const docs = documents.filter((d) => d.documentType === type);
            const state = slotState(docs);
            const Mark = MARK[state];
            const isRequired = required.includes(type);
            return (
              <li key={type} className={`gc-slot is-${state}`}>
                <span className="gc-slot-mark">{Mark && <Mark className="gc-icon" aria-hidden="true" />}</span>
                <div className="gc-slot-body">
                  <strong>{docLabel(type)}{!isRequired && <span className="gc-optional"> (optional)</span>}</strong>
                  <small>{state === "missing" ? HINTS[type] || "JPG, PNG or PDF, up to 8 MB" : state === "rejected" ? "Upload a replacement" : state === "checking" ? "Waiting to be checked" : "Checked"}</small>
                  {docs.length > 0 && <ul className="gc-slot-files">{docs.map((d) => fileRow(d))}</ul>}
                </div>
                {editable && uploadButton({ type, label: state === "missing" ? "Upload" : state === "rejected" ? "Replace" : "Add another", primary: state === "rejected" })}
              </li>
            );
          })}
        </ul>
      </section>
      {(others.length > 0 || editable) && (
        <section className="gc-evidence" aria-labelledby="evidence-other">
          <div className="gc-evidence-head"><h3 id="evidence-other">Other documents</h3></div>
          {others.length > 0 && <ul className="gc-slot-files gc-other-files">{others.map((d) => fileRow(d, `${docLabel(d.documentType)}: ${d.originalName}`))}</ul>}
          {editable && (
            <div className="gc-drop">
              <Upload className="gc-icon" aria-hidden="true" />
              <strong>Add another document</strong>
              <small>Estimates, appeal evidence or anything else that helps. JPG, PNG or PDF, up to 8 MB each.</small>
              <div className="gc-drop-controls">
                <Field label="Type of document">
                  <select value={otherType} onChange={(e) => setOtherType(e.target.value)}>
                    {documentTypes.filter((t) => !slotTypes.includes(t)).map((t) => <option key={t} value={t}>{docLabel(t)}</option>)}
                  </select>
                </Field>
                {uploadButton({ type: otherType, label: "Choose files" })}
              </div>
            </div>
          )}
          {!editable && !others.length && <p className="gc-note">No other documents.</p>}
        </section>
      )}
    </div>
  );
}
