import { useState } from "react";
import { CheckCircle2, FileText, History, KeyRound, UserPlus, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { api, errorMessage } from "../services/api";
import { Alert, Confirm, CopyButton, Empty, ErrorState, Facts, Field, Loading, PageHeader, StatusChip, cx } from "../components/UI";
import { dateTime, label, phone } from "../utils/format";
import Pagination from "../components/Pagination";
import { PasswordRules } from "./Auth";

async function downloadVerification(user) {
  const r = await api.get(`/staff/${user._id}/document`, { responseType: "blob" }),
    url = URL.createObjectURL(r.data),
    a = document.createElement("a");
  a.href = url;
  a.download = user.verificationDocument?.originalName || "verification-document";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const FILTERS = [["PENDING", "Waiting for approval"], ["ACTIVE", "Active"], ["SUSPENDED", "Suspended"], ["REJECTED", "Rejected"], ["", "All"]];

export function StaffApprovals() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("PENDING");
  const r = useApi(`/staff/surveyor-applications?page=${page}${status ? `&status=${status}` : ""}`, { keepPrevious: true });
  const noneWaiting = status === "PENDING" && r.data?.items?.length === 0;
  const active = useApi(noneWaiting ? "/staff/surveyor-applications?status=ACTIVE" : null);
  const review = async (user, decision, reason = "") => {
    try {
      await api.patch(`/staff/surveyors/${user._id}/review`, { decision, reason });
      toast.success(decision === "APPROVE" ? `${user.name} can now use the surveyor workspace.` : `${user.name}’s application was rejected.`);
      r.reload();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };
  const setAccount = async (user, next) => {
    try {
      await api.patch(`/staff/${user._id}/status`, { status: next });
      toast.success(next === "ACTIVE" ? `${user.name} reactivated.` : `${user.name} suspended.`);
      r.reload();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };
  return (
    <>
      <PageHeader title="Surveyors" description="Check each applicant’s details and document before granting access to claim assignments." />
      <div className="gc-segmented" role="group" aria-label="Show surveyors">
        {FILTERS.map(([value, text]) => <button type="button" key={text} className={cx(status === value && "is-active")} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}>{text}</button>)}
      </div>
      {r.loading ? <Loading /> : r.error && !r.data ? <ErrorState message={r.error} retry={r.reload} /> : r.data.items.length ? (
        <div className="gc-stack-lg">
          {r.data.items.map((user) => (
            <article className="gc-card" key={user._id} aria-labelledby={`s-${user._id}`}>
              <div className="gc-card-head">
                <div><h2 id={`s-${user._id}`}>{user.name}</h2><p>{user.email} · {phone(user.phone)}</p></div>
                <StatusChip status={user.status} kind="staff" />
              </div>
              <Facts items={[
                ["Licence or ID", <span className="gc-ref" key="id">{user.surveyorId}</span>],
                ["Qualification", user.qualification],
                ["Experience", user.experience != null ? `${user.experience} years` : null],
                ["Region", user.surveyorRegion],
                ["Applied", dateTime(user.createdAt)],
                ["Address", user.address, true],
              ]} />
              {user.rejectionReason && <Alert tone="error" title="Reason for rejection">{user.rejectionReason}</Alert>}
              <div className="gc-actions gc-card-actions">
                {user.verificationDocument?.originalName && <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" onClick={() => downloadVerification(user).catch((e) => toast.error(errorMessage(e)))}><FileText className="gc-icon gc-icon--sm" aria-hidden="true" />Open their document</button>}
                {user.status === "PENDING" && (
                  <>
                    <Confirm title={`Approve ${user.name}?`} danger={false} description={`${user.name} will be able to sign in and receive claim assignments.`} confirmLabel="Approve surveyor" onConfirm={() => review(user, "APPROVE")}>
                      {(open) => <button type="button" className="gc-btn gc-btn--sm" onClick={open}><UserCheck className="gc-icon gc-icon--sm" aria-hidden="true" />Approve</button>}
                    </Confirm>
                    <Confirm title={`Reject ${user.name}’s application?`} description="The applicant sees your reason." confirmLabel="Reject application" reason={{ label: "Reason", hint: "For example: the licence number doesn’t match the document", minLength: 10 }} onConfirm={(reason) => review(user, "REJECT", reason)}>
                      {(open) => <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm gc-danger-text" onClick={open}><X className="gc-icon gc-icon--sm" aria-hidden="true" />Reject</button>}
                    </Confirm>
                  </>
                )}
                {user.status === "ACTIVE" && (
                  <Confirm title={`Suspend ${user.name}?`} description="They lose access to the surveyor workspace straight away. Their past reports stay on the claims." confirmLabel="Suspend surveyor" onConfirm={() => setAccount(user, "SUSPENDED")}>
                    {(open) => <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" onClick={open}>Suspend</button>}
                  </Confirm>
                )}
                {user.status === "SUSPENDED" && (
                  <Confirm title={`Reactivate ${user.name}?`} danger={false} description="They can sign in and receive assignments again." confirmLabel="Reactivate surveyor" onConfirm={() => setAccount(user, "ACTIVE")}>
                    {(open) => <button type="button" className="gc-btn gc-btn--sm" onClick={open}>Reactivate</button>}
                  </Confirm>
                )}
              </div>
            </article>
          ))}
          <Pagination data={r.data} noun="surveyors" onPage={setPage} />
        </div>
      ) : status === "PENDING" ? (
        <Empty
          level={2}
          icon={UserCheck}
          title="No applications waiting"
          description={`Applicants use the surveyor access form on the public site, and each one appears here for review.${active.data ? ` ${active.data.total} surveyor${active.data.total === 1 ? " is" : "s are"} active now.` : ""}`}
          action={<button type="button" className="gc-btn gc-btn--secondary" onClick={() => { setStatus("ACTIVE"); setPage(1); }}>Show active surveyors</button>}
        />
      ) : <Empty level={2} icon={UserCheck} title="No surveyors to show" description="No one has this status. Choose another filter above." />}
    </>
  );
}

export function StaffManagement() {
  const [page, setPage] = useState(1);
  const staff = useApi(`/staff?page=${page}`, { keepPrevious: true });
  const [showForm, setShowForm] = useState(false);
  const [temporary, setTemporary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tempPassword, setTempPassword] = useState("");
  const audit = useApi(selected ? `/staff/${selected._id}/audit` : null);
  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/staff/admins", Object.fromEntries(new FormData(e.currentTarget)));
      toast.success("Admin account created. They must choose their own password when they first sign in.");
      setShowForm(false);
      setTempPassword("");
      staff.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const changeStatus = async (user, status) => {
    try {
      await api.patch(`/staff/${user._id}/status`, { status });
      toast.success(`${user.name} ${status === "ACTIVE" ? "reactivated" : "suspended"}.`);
      staff.reload();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };
  const reset = async (user) => {
    try {
      const r = await api.post(`/staff/${user._id}/reset-password`);
      setTemporary({ name: user.name, email: user.email, password: r.data.temporaryPassword });
      staff.reload();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };
  return (
    <>
      <PageHeader
        title="Staff"
        description="Admin and surveyor accounts. Create admins here; surveyors apply and are approved under Surveyors."
        action={<button type="button" className="gc-btn" onClick={() => setShowForm(!showForm)} aria-expanded={showForm}>{showForm ? "Cancel" : <><UserPlus className="gc-icon" aria-hidden="true" />Create an admin</>}</button>}
      />
      {temporary && (
        <Alert tone="warning" title={`Temporary password for ${temporary.name}`} action={<button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={() => setTemporary(null)}>Done</button>}>
          <p>Copy it now and give it to {temporary.email} securely. It won’t be shown again.</p>
          <p className="gc-temp-password"><span className="gc-ref">{temporary.password}</span><CopyButton value={temporary.password} label="Copy password" /></p>
        </Alert>
      )}
      {showForm && (
        <section className="gc-card" aria-labelledby="create-admin">
          <div className="gc-card-head"><div><h2 id="create-admin">Create an admin</h2><p>They must replace the temporary password when they first sign in.</p></div></div>
          <form className="gc-form" onSubmit={create}>
            <div className="gc-form-grid">
              <Field label="Full name" name="name" required />
              <Field label="Email address" name="email" type="email" required />
              <Field label="Mobile number" name="phone" required inputMode="numeric" />
              <Field label="Employee ID" name="employeeId" required />
              <Field label="Temporary password" hint="At least 10 characters" name="temporaryPassword" type="password" minLength="10" required value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <PasswordRules value={tempPassword} />
            <div className="gc-form-actions"><button className="gc-btn">Create admin</button></div>
          </form>
        </section>
      )}
      {staff.loading ? <Loading /> : staff.error && !staff.data ? <ErrorState message={staff.error} retry={staff.reload} /> : (
        <section className="gc-card gc-card--flush" aria-label="Staff accounts">
          <div className="gc-table-wrap">
            <table className="gc-table">
              <thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">ID</th><th scope="col"><span className="gc-sr">Actions</span></th></tr></thead>
              <tbody>
                {staff.data.items.map((user) => (
                  <tr key={user._id}>
                    <td><strong>{user.name}</strong><small className="gc-block gc-muted">{user.email} · {phone(user.phone)}</small></td>
                    <td>{label(user.role)}</td>
                    <td><StatusChip status={user.status} kind="staff" />{user.mustChangePassword && <small className="gc-block gc-muted">Must change password</small>}</td>
                    <td><span className="gc-ref">{user.employeeId || user.surveyorId || "—"}</span></td>
                    <td className="gc-cell-actions">
                      <div className="gc-actions">
                        {user.role !== "SUPER_ADMIN" && user.status === "ACTIVE" && (
                          <Confirm title={`Suspend ${user.name}?`} description="They’re signed out and can’t sign in until reactivated. Their past work stays on the claims." confirmLabel="Suspend account" onConfirm={() => changeStatus(user, "SUSPENDED")}>
                            {(open) => <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" onClick={open}>Suspend<span className="gc-sr"> {user.name}</span></button>}
                          </Confirm>
                        )}
                        {user.status === "SUSPENDED" && (
                          <Confirm title={`Reactivate ${user.name}?`} danger={false} description="They can sign in again." confirmLabel="Reactivate account" onConfirm={() => changeStatus(user, "ACTIVE")}>
                            {(open) => <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" onClick={open}>Reactivate<span className="gc-sr"> {user.name}</span></button>}
                          </Confirm>
                        )}
                        {user.role !== "SUPER_ADMIN" && (
                          <Confirm title={`Reset ${user.name}’s password?`} description="They’re signed out everywhere and must sign in with the temporary password you’ll see next, then choose a new one." confirmLabel="Reset password" onConfirm={() => reset(user)}>
                            {(open) => <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={open}><KeyRound className="gc-icon gc-icon--sm" aria-hidden="true" />Reset password<span className="gc-sr"> for {user.name}</span></button>}
                          </Confirm>
                        )}
                        <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={() => setSelected(user)}><History className="gc-icon gc-icon--sm" aria-hidden="true" />History<span className="gc-sr"> for {user.name}</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination data={staff.data} noun="staff" onPage={setPage} />
        </section>
      )}
      {selected && (
        <div className="gc-modal" role="presentation" onKeyDown={(e) => { if (e.key === "Escape") setSelected(null); }}>
          <section className="gc-dialog gc-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="staff-audit-title">
            <button type="button" className="gc-btn gc-btn--quiet gc-btn--icon gc-dialog-close" aria-label="Close" autoFocus onClick={() => setSelected(null)}><X className="gc-icon" aria-hidden="true" /></button>
            <h2 id="staff-audit-title">History for {selected.name}</h2>
            {audit.loading ? <Loading /> : audit.error ? <ErrorState message={audit.error} retry={audit.reload} /> : audit.data?.length ? (
              <ol className="gc-timeline">
                {audit.data.map((event) => (
                  <li key={event._id}><span className="gc-timeline-dot" aria-hidden="true" /><div><strong>{label(event.action)}</strong>{event.note && <p>{event.note}</p>}<span className="gc-note">{dateTime(event.timestamp)} · {event.actor?.name}</span></div></li>
                ))}
              </ol>
            ) : <Empty icon={CheckCircle2} title="No history yet" description="Account changes for this person will appear here." />}
          </section>
        </div>
      )}
    </>
  );
}
