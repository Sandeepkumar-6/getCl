import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell, CheckCheck, ClipboardCheck, Files, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../services/api";
import { Confirm, Empty, ErrorState, Facts, Field, Loading, PageHeader, Plate, StatusChip, cx, plateType } from "../components/UI";
import { date, dateShort, dateTime, humaniseText, initials, label, phone } from "../utils/format";
import { describe } from "../utils/status";
import { nextStepText } from "../utils/status";
import Pagination from "../components/Pagination";

const DELIVERY = { SENT: "sent", DELIVERED: "sent", FAILED: "not delivered", SKIPPED: "not sent" };

export function Notifications() {
  const [page, setPage] = useState(1);
  const r = useApi(`/notifications?page=${page}`, { keepPrevious: true });
  const [busy, setBusy] = useState(false);
  const mark = async (id) => {
    setBusy(true);
    try {
      await api.patch("/notifications/" + (id ? id + "/read" : "read-all"));
      await r.reload();
      window.dispatchEvent(new Event("notifications-changed"));
      if (!id) toast.success("All notifications marked as read.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const items = r.data?.items || [];
  const unread = items.filter((n) => !n.read).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread on this page.` : "Updates about your claims, vehicles and account."}
        action={<button type="button" className="gc-btn gc-btn--secondary" disabled={busy || !unread} onClick={() => mark()}><CheckCheck className="gc-icon" aria-hidden="true" />Mark all as read</button>}
      />
      {r.loading ? <Loading label="Loading notifications…" /> : r.error && !r.data ? <ErrorState message={r.error} retry={r.reload} /> : items.length ? (
        <section className="gc-card gc-card--flush" aria-label="Notifications">
          <ul className="gc-notifications">
            {items.map((n) => {
              const channels = [["Email", n.delivery?.email], ["SMS", n.delivery?.sms]].filter(([, s]) => s && DELIVERY[s]);
              return (
                <li key={n._id} className={cx(!n.read && "is-unread")}>
                  <Bell className="gc-icon" aria-hidden="true" />
                  <div>
                    <strong>{!n.read && <span className="gc-sr">Unread: </span>}{describe(n.title)}</strong>
                    <p>{describe(n.message)}</p>
                    <span className="gc-note">{dateTime(n.createdAt)}{n.category ? ` · ${label(n.category)}` : ""}{channels.length ? ` · ${channels.map(([c, s]) => `${c} ${DELIVERY[s]}`).join(", ")}` : ""}</span>
                  </div>
                  <div className="gc-notification-actions">
                    {(n.deepLink || n.claim) && <Link className="gc-btn gc-btn--secondary gc-btn--sm" to={n.deepLink || "/portal/claims/" + n.claim} onClick={() => !n.read && mark(n._id)}>Open</Link>}
                    {!n.read && <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" disabled={busy} onClick={() => mark(n._id)}>Mark as read</button>}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination data={r.data} noun="notifications" onPage={setPage} />
        </section>
      ) : <Empty level={2} icon={Bell} title="You’re up to date" description="Claim, vehicle and account updates will appear here." />}
    </>
  );
}

export function Profile() {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeader title="Profile" description="Your contact details. We use them for claim updates." />
      <div className="gc-grid-2 gc-grid-profile">
        <section className="gc-card" aria-labelledby="profile-form-title">
          <div className="gc-profile-head">
            <span className="gc-avatar gc-avatar--lg" aria-hidden="true">{initials(user.name)}</span>
            <div><h2 id="profile-form-title">{user.name}</h2><p className="gc-muted">{user.email} · {label(user.role)}</p></div>
          </div>
          <form
            className="gc-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const r = await api.patch("/auth/me", Object.fromEntries(new FormData(e.target)));
                setUser(r.data);
                toast.success("Profile saved.");
              } catch (err) {
                toast.error(errorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="gc-form-grid">
              <Field label="Full name" name="name" defaultValue={user.name || ""} required autoComplete="name" />
              <Field label="Mobile number" name="phone" defaultValue={user.phone || ""} required inputMode="numeric" autoComplete="tel-national" />
              <Field label="Address" optional name="address" defaultValue={user.address || ""} autoComplete="street-address" />
              <Field label="City" optional name="city" defaultValue={user.city || ""} autoComplete="address-level2" />
              <Field label="State" optional name="state" defaultValue={user.state || ""} autoComplete="address-level1" />
              <Field label="PIN code" optional name="pincode" defaultValue={user.pincode || ""} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
            </div>
            <p className="gc-note">Your email address can’t be changed here. Contact support to change it.</p>
            <div className="gc-form-actions"><button className="gc-btn" disabled={busy} aria-busy={busy}>{busy ? "Saving…" : "Save profile"}</button></div>
          </form>
        </section>
        <div className="gc-col">
          <section className="gc-card" aria-labelledby="account-title">
            <div className="gc-card-head"><h2 id="account-title">Account</h2></div>
            <Facts columns={1} items={[
              ["Email", <>{user.email}<small>{user.emailVerified ? `Verified${user.emailVerifiedAt ? ` on ${date(user.emailVerifiedAt)}` : ""}` : "Not verified yet. Check your inbox for the link."}</small></>],
              ["Account type", label(user.role)],
              user.role === "SURVEYOR" && user.surveyorRegion && ["Region", user.surveyorRegion],
              user.createdAt && ["Member since", date(user.createdAt)],
            ]} />
          </section>
          <section className="gc-card" aria-labelledby="security-title">
            <div className="gc-card-head"><h2 id="security-title">Sign-in and security</h2></div>
            <Facts columns={1} items={[["Password", user.passwordChangedAt ? `Last changed ${date(user.passwordChangedAt)}` : "Not changed since you joined"]]} />
            <p className="gc-body-text">Never share your password. Five wrong attempts lock your account for 15 minutes.</p>
            <div><Link className="gc-btn gc-btn--secondary" to="/portal/password"><KeyRound className="gc-icon" aria-hidden="true" />Change password</Link></div>
          </section>
        </div>
      </div>
    </>
  );
}

export function Users() {
  const [page, setPage] = useState(1);
  const r = useApi(`/admin/users?page=${page}`, { keepPrevious: true });
  const toggle = async (u) => {
    try {
      await api.patch("/admin/users/" + u._id + "/status", { active: u.status !== "ACTIVE" });
      toast.success(`${u.name} ${u.status === "ACTIVE" ? "deactivated" : "reactivated"}.`);
      r.reload();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };
  return (
    <>
      <PageHeader title="Policyholders" description="Accounts and their status. Staff accounts are managed under Surveyors and Staff." />
      {r.loading ? <Loading /> : r.error && !r.data ? <ErrorState message={r.error} retry={r.reload} /> : (
        <section className="gc-card gc-card--flush" aria-label="Accounts">
          <div className="gc-table-wrap">
            <table className="gc-table">
              <thead><tr><th scope="col">Name</th><th scope="col">Contact</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col"><span className="gc-sr">Actions</span></th></tr></thead>
              <tbody>
                {r.data.items.map((u) => (
                  <tr key={u._id}>
                    <td><strong>{u.name}</strong><small className="gc-block gc-muted">{u.surveyorRegion || u.city}</small></td>
                    <td>{u.email}<small className="gc-block gc-muted">{phone(u.phone)}</small></td>
                    <td>{label(u.role)}</td>
                    <td><StatusChip status={u.status} kind="staff" /></td>
                    <td className="gc-cell-actions">
                      {u.role === "POLICYHOLDER" ? (
                        <Confirm
                          danger={u.status === "ACTIVE"}
                          title={`${u.status === "ACTIVE" ? "Deactivate" : "Reactivate"} ${u.name}’s account?`}
                          description={u.status === "ACTIVE" ? `${u.name} won’t be able to sign in. Their claims and records stay as they are.` : `${u.name} will be able to sign in again.`}
                          confirmLabel={u.status === "ACTIVE" ? "Deactivate account" : "Reactivate account"}
                          onConfirm={() => toggle(u)}
                        >
                          {(open) => <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" onClick={open}>{u.status === "ACTIVE" ? "Deactivate" : "Reactivate"}<span className="gc-sr"> {u.name}</span></button>}
                        </Confirm>
                      ) : <span className="gc-note">Managed in {u.role === "SURVEYOR" ? "Surveyors" : "Staff"}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination data={r.data} noun="accounts" onPage={setPage} />
        </section>
      )}
    </>
  );
}

export function Audit() {
  const [page, setPage] = useState(1);
  const r = useApi("/admin/audit-logs?page=" + page, { keepPrevious: true });
  return (
    <>
      <PageHeader title="Audit log" description="Status changes, document checks and account actions, with who did them and why." />
      {r.loading ? <Loading /> : r.error && !r.data ? <ErrorState message={r.error} retry={r.reload} /> : (
        <section className="gc-card gc-card--flush" aria-label="Audit events">
          <div className="gc-table-wrap">
            <table className="gc-table">
              <thead><tr><th scope="col">When and who</th><th scope="col">Claim</th><th scope="col">Action</th><th scope="col">Change and reason</th></tr></thead>
              <tbody>
                {r.data.items.map((a) => (
                  <tr key={a._id}>
                    <td>{dateTime(a.timestamp)}<small className="gc-block gc-muted">{a.actor?.name} · {label(a.actorRole)}</small></td>
                    <td>{a.claim ? <Link className="gc-link gc-ref" to={"/portal/claims/" + a.claim._id}>{a.claim.claimNumber}</Link> : <span className="gc-muted">Account</span>}</td>
                    <td>{label(a.action)}</td>
                    <td>{a.previousValue && <small className="gc-block">{label(a.previousValue)} → {label(a.newValue)}</small>}{humaniseText(a.note)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="gc-pagination" aria-label="Pages">
            <span>{r.data.total} events · page {page}</span>
            <div className="gc-actions">
              <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous page</button>
              <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" disabled={page * 25 >= r.data.total} onClick={() => setPage(page + 1)}>Next page</button>
            </div>
          </nav>
        </section>
      )}
    </>
  );
}

// Staff "Documents" and "Inspections", and the policyholder's "Payments": claim lists that open the right tab.
export function ClaimResources({ inspections = false, payments = false }) {
  if (payments) return <Payments />;
  return <ClaimResourceList inspections={inspections} />;
}

// Claims from approval onwards: where payouts and payment records appear. The list API takes one status, so each stage is fetched and merged.
const PAYOUT_STATUSES = ["APPROVED", "ON_ACCOUNT_PAYMENT", "REPAIR_IN_PROGRESS", "READY_FOR_DELIVERY", "SETTLED"];
function Payments() {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    Promise.all(PAYOUT_STATUSES.map((status) => api.get(`/claims?status=${status}`)))
      .then((responses) => {
        if (!live) return;
        const items = responses.flatMap((res) => res.data.items).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        setState({ loading: false, items, more: responses.some((res) => res.data.pages > 1), error: "" });
      })
      .catch((error) => live && setState({ loading: false, items: [], error: errorMessage(error) }));
    return () => { live = false; };
  }, [attempt]);
  const inProgress = state.items.filter((c) => c.status !== "SETTLED").length;
  return (
    <>
      <PageHeader title="Payments" description="Claims that have been approved, with their payout and repair stage. Amounts and payment records are on each claim, under Decision and payout." />
      {state.loading ? <Loading label="Loading payouts…" /> : state.error ? <ErrorState message={state.error} retry={() => { setState((s) => ({ ...s, loading: true })); setAttempt((n) => n + 1); }} /> : state.items.length ? (
        <section className="gc-card gc-card--flush" aria-labelledby="payouts-title">
          <div className="gc-card-head"><div><h2 id="payouts-title">Approved claims</h2><p>{inProgress} in progress · {state.items.length - inProgress} settled</p></div></div>
          <ul className="gc-resource-list">
            {state.items.map((c) => (
              <li key={c._id}>
                <Link to={`/portal/claims/${c._id}?tab=decision`}>
                  <span className="gc-claim-id"><span className="gc-ref">{c.claimNumber}</span><span className="gc-claim-veh"><Plate registration={c.vehicle?.registrationNumber} type={plateType(c.vehicle)} />{c.vehicle?.manufacturer} {c.vehicle?.model}</span></span>
                  <StatusChip status={c.status} />
                  <span className="gc-note">{nextStepText(c.status)}</span>
                  <span className="gc-note">{dateShort(c.updatedAt || c.createdAt)}</span>
                  <ArrowRight className="gc-icon" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          {state.more && <p className="gc-note gc-resource-foot">Showing the latest claims at each stage. <Link to="/portal/claims">See every claim</Link></p>}
        </section>
      ) : (
        <Empty level={2} icon={Files} title="No payouts yet" description="A claim appears here once it’s approved. You’ll then see the amount, any deductions and each payment under Decision and payout." action={<Link className="gc-btn gc-btn--secondary" to="/portal/claims">View your claims</Link>} />
      )}
      {!state.loading && !state.error && (
        <section className="gc-card" aria-labelledby="payout-how">
          <div className="gc-card-head"><h2 id="payout-how">How payouts are worked out</h2></div>
          <ul className="gc-plain-list gc-about-list gc-about-list--flush">
            <li>From the surveyor’s assessment, minus depreciation and deductibles, and capped at the insured declared value (IDV).</li>
            <li>Each claim’s Decision and payout tab shows every line of the calculation and each payment recorded against it.</li>
            <li>getClaim is a demonstration service. Payments recorded here don’t move money.</li>
          </ul>
        </section>
      )}
    </>
  );
}

function ClaimResourceList({ inspections }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const r = useApi("/claims?page=" + page, { keepPrevious: true });
  const title = inspections ? "Inspections" : "Documents";
  const rows = (r.data?.items || []).filter((c) => !inspections || c.assignedSurveyor);
  return (
    <>
      <PageHeader
        title={title}
        description={inspections ? "Claims with a surveyor assigned. Open one to book, submit or review its inspection." : "Documents are kept with each claim. Open a claim to upload, download or check them."}
      />
      {r.loading ? <Loading /> : r.error && !r.data ? <ErrorState message={r.error} retry={r.reload} /> : rows.length ? (
        <section className="gc-card gc-card--flush" aria-label={title}>
          <ul className="gc-resource-list">
            {rows.map((c) => (
              <li key={c._id}>
                <Link to={`/portal/claims/${c._id}`}>
                  <span className="gc-claim-id"><span className="gc-ref">{c.claimNumber}</span><span className="gc-claim-veh"><Plate registration={c.vehicle?.registrationNumber} type={plateType(c.vehicle)} />{c.vehicle?.manufacturer} {c.vehicle?.model}</span></span>
                  <StatusChip status={c.status} role={user.role} />
                  <span className="gc-note">{inspections ? `Surveyor: ${c.assignedSurveyor?.name}` : user.role === "POLICYHOLDER" ? nextStepText(c.status) : c.policyholder?.name}</span>
                  <span className="gc-note">{dateShort(c.updatedAt || c.createdAt)}</span>
                  <ArrowRight className="gc-icon" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination data={r.data} noun="claims" onPage={setPage} />
        </section>
      ) : (
        <Empty level={2} icon={inspections ? ClipboardCheck : Files} title={inspections ? "No inspections on this page" : `No claims to show`} description={inspections && r.data?.pages > 1 ? "Assigned claims may be on another page." : "Claims available to your account will appear here."} action={r.data?.pages > 1 ? <Pagination data={r.data} noun="claims" onPage={setPage} /> : null} />
      )}
    </>
  );
}
