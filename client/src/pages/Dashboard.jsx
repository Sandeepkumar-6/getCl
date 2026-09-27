import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUp, Car, CheckCircle2, ClipboardCheck, Clock3, Files, UserRound, Users, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Empty, ErrorState, Loading, PageHeader, Plate, StatusChip, cx, plateType } from "../components/UI";
import PolicyholderDashboard from "./PolicyholderDashboard";
import { dateShort, dateTime, greeting, money, monthLabel, statuses } from "../utils/format";
import { claimStatus, describe, familyColor, nextStepText } from "../utils/status";

export default function Dashboard() {
  const { user } = useAuth();
  return user.role === "POLICYHOLDER" ? <PolicyholderDashboard /> : <StaffDashboard />;
}

const CLOSED = ["DRAFT", "REJECTED", "SETTLED"];
const SURVEYED = ["INSPECTION_COMPLETED", "ESTIMATE_SUBMITTED", "SUPPLEMENTARY_ESTIMATE", "TOTAL_LOSS", "APPROVED", "REJECTED", "APPEALED", "ON_ACCOUNT_PAYMENT", "REPAIR_IN_PROGRESS", "READY_FOR_DELIVERY", "SETTLED"];
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
const pastDue = (c) => Boolean(c.breachedAt || (c.dueAt && new Date(c.dueAt) < new Date() && !["SETTLED", "REJECTED", "DRAFT"].includes(c.status)));

function Queue({ count, label, hint, zeroHint, to, tone }) {
  const clear = !count;
  return (
    <Link className={cx(clear ? "is-clear" : `is-${tone}`)} to={to}>
      <span className="gc-queue-count">{count || 0}{clear && <CheckCircle2 className="gc-icon" aria-hidden="true" />}</span>
      <span className="gc-queue-label">{label}</span>
      <span className="gc-queue-hint">{clear ? zeroHint : hint}</span>
    </Link>
  );
}

// A headline number. With `share`, a thin meter shows it as a part of all claims in scope.
function Kpi({ title, value, icon: Icon, note, share, to }) {
  const body = (
    <>
      <div className="gc-kpi-top">
        <span className="gc-kpi-title">{title}</span>
        {Icon && <span className="gc-kpi-icon"><Icon className="gc-icon" aria-hidden="true" /></span>}
      </div>
      <strong className="gc-kpi-value">{value}</strong>
      {share !== undefined && (
        <span className="gc-kpi-meter" aria-hidden="true"><span style={{ width: `${share}%` }} /></span>
      )}
      {note && <span className="gc-kpi-note">{note}</span>}
    </>
  );
  return to ? <Link className="gc-kpi is-link" to={to}>{body}</Link> : <article className="gc-kpi">{body}</article>;
}

function kpis(role, s) {
  const c = s.counts || {};
  const n = (...keys) => keys.reduce((sum, k) => sum + (c[k] || 0), 0);
  const total = s.total || 0;
  const open = total - n(...CLOSED);
  if (role === "SUPER_ADMIN") {
    const g = s.governance || {};
    return [
      { title: "All claims", value: total, icon: Files, note: `${open} open · ${n("SETTLED")} settled`, to: "/portal/claims" },
      { title: "Policyholders", value: g.users || 0, icon: UserRound, note: "Registered customer accounts", to: "/portal/users" },
      { title: "Vehicles", value: g.vehicles || 0, icon: Car, note: "Vehicles on active accounts" },
      { title: "Staff and admins", value: (g.surveyors || 0) + (g.administrators || 0), icon: Users, note: `${g.surveyors || 0} surveyors · ${g.administrators || 0} admins`, to: "/portal/staff" },
    ];
  }
  if (role === "SURVEYOR") {
    const booked = n("SURVEYOR_ASSIGNED"), due = n("INSPECTION_SCHEDULED"), done = n(...SURVEYED);
    return [
      { title: "Assigned to you", value: total, icon: Files, note: `${open} still open`, to: "/portal/claims" },
      { title: "Inspections to book", value: booked, icon: Clock3, share: pct(booked, total), note: `${pct(booked, total)}% of your claims`, to: "/portal/claims?status=SURVEYOR_ASSIGNED" },
      { title: "Reports due", value: due, icon: ClipboardCheck, share: pct(due, total), note: `${pct(due, total)}% of your claims`, to: "/portal/claims?status=INSPECTION_SCHEDULED" },
      { title: "Surveys done", value: done, icon: CheckCircle2, share: pct(done, total), note: `${pct(done, total)}% of your claims` },
    ];
  }
  const fresh = n("SUBMITTED"), review = n("UNDER_REVIEW");
  return [
    { title: "All claims", value: total, icon: Files, note: `${open} open · ${n("SETTLED")} settled`, to: "/portal/claims" },
    { title: "New", value: fresh, icon: Clock3, share: pct(fresh, total), note: "Submitted, waiting for review", to: "/portal/claims?status=SUBMITTED" },
    { title: "In review", value: review, icon: ClipboardCheck, share: pct(review, total), note: `${s.attention?.awaitingSurveyor || 0} still need a surveyor`, to: "/portal/claims?status=UNDER_REVIEW" },
    { title: "Approved payouts", value: money(s.approvedAmount), icon: Wallet, note: `${n("SETTLED")} claim${n("SETTLED") === 1 ? "" : "s"} settled` },
  ];
}

const FAMILY_ORDER = ["action", "progress", "positive", "critical", "neutral"];
const familyName = (family, role) =>
  ({ action: role === "SURVEYOR" ? "Your move" : "Claims team’s move", progress: "With someone else", positive: "Approved or settled", critical: "Rejected", neutral: "Drafts" })[family];

// Every status with claims, grouped by who acts next. Each row opens the queue filtered to that status.
function StatusBreakdown({ counts = {}, total, role }) {
  const rows = statuses.filter((k) => counts[k]).map((k) => ({ key: k, value: counts[k], ...claimStatus(k, role) }));
  if (!rows.length) return <Empty title="No claims yet" description="Claims in your queue will be counted here." />;
  const max = Math.max(...rows.map((r) => r.value));
  const families = FAMILY_ORDER.map((family) => ({ family, value: rows.filter((r) => r.family === family).reduce((sum, r) => sum + r.value, 0) })).filter((f) => f.value);
  const summary = families.map((f) => `${familyName(f.family, role)}: ${f.value}`).join(", ");
  return (
    <div className="gc-breakdown">
      <div className="gc-breakdown-bar" role="img" aria-label={`${total} claims. ${summary}.`}>
        {families.map((f) => <span key={f.family} style={{ flexGrow: f.value, background: familyColor[f.family] }} />)}
      </div>
      <ul className="gc-breakdown-legend">
        {families.map((f) => (
          <li key={f.family}><span className="gc-dot" style={{ background: familyColor[f.family] }} aria-hidden="true" />{familyName(f.family, role)} <strong>{f.value}</strong></li>
        ))}
      </ul>
      <ul className="gc-breakdown-list" aria-label="Claims by status">
        {rows.map((r) => (
          <li key={r.key}>
            <Link to={`/portal/claims?status=${r.key}`}>
              <span className="gc-breakdown-name"><span className="gc-dot" style={{ background: familyColor[r.family] }} aria-hidden="true" />{r.label}</span>
              <span className="gc-breakdown-meter" aria-hidden="true"><span style={{ width: `${Math.max(4, (r.value / max) * 100)}%`, background: familyColor[r.family] }} /></span>
              <span className="gc-breakdown-count">{r.value}<span className="gc-note"> · {pct(r.value, total)}%</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="gc-kpis" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => <div key={i} className="gc-kpi"><span className="gc-skel" style={{ width: "55%" }} /><span className="gc-skel gc-skel--lg" /><span className="gc-skel" style={{ width: "70%" }} /></div>)}
    </div>
  );
}

const chartTick = { fontSize: 12, fill: "var(--ink-muted)" };

function StaffDashboard() {
  const { user } = useAuth(),
    stats = useApi("/claims/stats"),
    notifications = useApi("/notifications");
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role),
    isSurveyor = user.role === "SURVEYOR";
  const queueLabel = isSurveyor ? "Your assignments" : "Claim queue";
  const header = (
    <PageHeader
      title={greeting(user.name)}
      description={user.role === "SUPER_ADMIN" ? "Claims, people and activity across getClaim." : isAdmin ? "Queues that need the claims team, then everything else." : "Inspections and reports assigned to you."}
      action={<Link className="gc-btn" to="/portal/claims">{`Open ${queueLabel.toLowerCase()}`} <ArrowRight className="gc-icon" aria-hidden="true" /></Link>}
    />
  );
  if (stats.loading) return <>{header}<div role="status" className="gc-sr">Loading the overview…</div><KpiSkeleton /><ClaimsPanel role={user.role} isAdmin={isAdmin} isSurveyor={isSurveyor} /></>;
  if (stats.error) return <>{header}<ErrorState message={stats.error} retry={stats.reload} /></>;
  const s = stats.data;
  const monthly = (s.monthly || []).map((row) => ({ ...row, name: monthLabel(row.name) }));
  return (
    <>
      {header}
      {isAdmin && (
        <section aria-labelledby="attention-title" className="gc-stack">
          <h2 id="attention-title" className="gc-section-head-title">Needs attention</h2>
          <nav className="gc-queue" aria-label="Queues that need attention">
            <Queue tone="critical" count={s.attention?.slaBreaches} label="Past the IRDAI deadline" hint="Opens the claim queue filtered to past due date" zeroHint="No claims are past their deadline" to="/portal/claims?sla=breached" />
            <Queue tone="action" count={s.attention?.awaitingSurveyor} label="Waiting for a surveyor" hint="Assign within 24 hours of review" zeroHint="Every claim that needs a surveyor has one" to="/portal/claims?assignment=unassigned" />
            <Queue tone="action" count={s.attention?.documentsAwaitingVerification} label="Documents to check" hint="Opens the claim queue filtered to unchecked documents" zeroHint="All uploaded documents are checked" to="/portal/claims?documents=pending" />
            <Queue tone="action" count={s.attention?.decisionsDueToday} label="Decisions due in 24 hours" hint="Opens the claim queue filtered to decisions due" zeroHint="Nothing due in the next 24 hours" to="/portal/claims?decision=due" />
          </nav>
        </section>
      )}
      <section aria-label="Key numbers" className="gc-kpis">{kpis(user.role, s).map((k) => <Kpi key={k.title} {...k} />)}</section>
      <div className="gc-grid-2">
        <section className="gc-card" aria-labelledby="status-breakdown">
          <div className="gc-card-head"><div><h2 id="status-breakdown">Claims by status</h2><p>Colour shows who acts next · select a status to open it</p></div></div>
          <StatusBreakdown counts={s.counts} total={s.total} role={user.role} />
        </section>
        {isAdmin ? (
          <section className="gc-card" aria-labelledby="trend-chart">
            <div className="gc-card-head"><div><h2 id="trend-chart">Claims filed per month</h2><p>{monthly.length ? `Last ${monthly.length} month${monthly.length === 1 ? "" : "s"}` : "No claims filed yet"}</p></div></div>
            {monthly.length ? (
              <div className="gc-chart gc-chart--fill">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="name" tick={chartTick} stroke="var(--line)" />
                    <YAxis allowDecimals={false} tick={chartTick} stroke="var(--line)" />
                    <Tooltip cursor={{ fill: "var(--surface-sunken)" }} contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-raised)", color: "var(--ink)", fontFamily: "var(--font-text)" }} />
                    <Bar dataKey="value" name="Claims" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty title="Nothing to chart yet" description="Monthly totals appear once claims are filed." />}
          </section>
        ) : (
          <section className="gc-card" aria-labelledby="latest-notes">
            <NotificationsPreview id="latest-notes" notifications={notifications} role={user.role} />
          </section>
        )}
      </div>
      <ClaimsPanel role={user.role} isAdmin={isAdmin} isSurveyor={isSurveyor} />
      <div className={isAdmin ? "gc-grid-2" : undefined}>
        <section className="gc-card" aria-labelledby="activity-title">
          <div className="gc-card-head"><div><h2 id="activity-title">Recent activity</h2><p>{isSurveyor ? "Changes on claims assigned to you" : "The latest changes across claims"}</p></div></div>
          {s.activity?.length ? (
            <ol className="gc-timeline">
              {s.activity.slice(0, 6).map((a) => (
                <li key={a._id}>
                  <span className="gc-timeline-dot" aria-hidden="true" />
                  <div>
                    {a.claim?._id || typeof a.claim === "string" ? <Link to={`/portal/claims/${a.claim?._id || a.claim}`}>{describe(a.note, user.role)}</Link> : <strong>{describe(a.note, user.role)}</strong>}
                    <span className="gc-note">{[a.claim?.claimNumber, a.actor?.name, dateTime(a.timestamp)].filter(Boolean).join(" · ")}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : <Empty title="No activity yet" description="Status changes and notes will be listed here." />}
        </section>
        {isAdmin && <section className="gc-card" aria-labelledby="latest-notes"><NotificationsPreview id="latest-notes" notifications={notifications} role={user.role} limit={5} /></section>}
      </div>
    </>
  );
}

// The newest (or oldest) page of claims, narrowed with the same filters the claim queue understands.
function ClaimsPanel({ role, isAdmin, isSurveyor }) {
  const [view, setView] = useState("all");
  const [order, setOrder] = useState("newest");
  const views = [
    ["all", isSurveyor ? "All assigned" : "All claims", ""],
    ["breached", "Past due date", "sla=breached"],
    isAdmin && ["unassigned", "No surveyor yet", "assignment=unassigned"],
  ].filter(Boolean);
  const query = [views.find(([key]) => key === view)?.[2], order === "oldest" && "sort=oldest"].filter(Boolean).join("&");
  const claims = useApi(`/claims${query ? `?${query}` : ""}`, { keepPrevious: true });
  const items = claims.data?.items || [];
  const total = claims.data?.total || 0;
  const Arrow = order === "newest" ? ArrowDown : ArrowUp;
  return (
    <section aria-labelledby="recent-claims" className="gc-card gc-card--flush gc-dtable-card">
      <div className="gc-card-head gc-dtable-head">
        <div>
          <h2 id="recent-claims">{isSurveyor ? "Your assignments" : "Claims"}</h2>
          <p>{claims.data ? `Showing ${items.length} of ${total}` : "Loading claims…"}</p>
        </div>
        <Link className="gc-link gc-link--arrow" to={`/portal/claims${query ? `?${query}` : ""}`}>Open in the claim queue <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link>
      </div>
      <div className="gc-segmented gc-dtable-views" role="group" aria-label="Show claims">
        {views.map(([key, label]) => (
          <button key={key} type="button" className={cx(view === key && "is-active")} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>
        ))}
      </div>
      {claims.error ? <div className="gc-dtable-pad"><ErrorState message={claims.error} retry={claims.reload} /></div>
        : claims.loading ? <TableSkeleton /> : !items.length ? (
          <div className="gc-dtable-pad"><Empty icon={Files} title={view === "all" ? "No claims to show" : "Nothing matches"} description={view === "breached" ? "No claims are past their due date." : view === "unassigned" ? "Every claim has a surveyor." : "Claims that reach your queue will appear here."} /></div>
        ) : (
          <div className="gc-dtable-wrap" aria-busy={claims.refreshing}>
            <table className={cx("gc-dtable", claims.refreshing && "is-refreshing")}>
              <thead>
                <tr>
                  <th scope="col">Claim</th>
                  {!isSurveyor && <th scope="col">Policyholder</th>}
                  <th scope="col">Status</th>
                  {!isSurveyor && <th scope="col">Assigned to</th>}
                  <th scope="col" aria-sort={order === "newest" ? "descending" : "ascending"}>
                    <button type="button" className="gc-dtable-sort" onClick={() => setOrder(order === "newest" ? "oldest" : "newest")}>
                      Filed <Arrow className="gc-icon gc-icon--sm" aria-hidden="true" /><span className="gc-sr">{order === "newest" ? ", newest first. Select for oldest first" : ", oldest first. Select for newest first"}</span>
                    </button>
                  </th>
                  <th scope="col">Due</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c._id}>
                    <td data-label="Claim">
                      <Link className="gc-dtable-link" to={`/portal/claims/${c._id}`}><span className="gc-ref">{c.claimNumber}</span></Link>
                      <span className="gc-dtable-veh">
                        <Plate registration={c.vehicle?.registrationNumber} type={plateType(c.vehicle)} />
                        <span>{[c.vehicle?.manufacturer, c.vehicle?.model].filter(Boolean).join(" ")}</span>
                      </span>
                    </td>
                    {!isSurveyor && <td data-label="Policyholder">{c.policyholder?.name || "—"}</td>}
                    <td data-label="Status">
                      <span className="gc-dtable-status">
                        <StatusChip status={c.status} role={role} />
                        {pastDue(c) && <StatusChip status="PAST_DUE" family="critical" label="Past due date" />}
                      </span>
                      <span className="gc-note">{nextStepText(c.status, role)}</span>
                    </td>
                    {!isSurveyor && <td data-label="Assigned to">{c.assignedSurveyor?.name || <span className="gc-muted">Unassigned</span>}</td>}
                    <td data-label="Filed">{dateShort(c.createdAt)}</td>
                    <td data-label="Due">{c.dueAt ? dateShort(c.dueAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </section>
  );
}

function TableSkeleton() {
  return (
    <div className="gc-dtable-pad gc-stack" role="status" aria-label="Loading claims">
      {[0, 1, 2, 3, 4].map((i) => <span key={i} className="gc-skel gc-skel--row" />)}
    </div>
  );
}

function NotificationsPreview({ id, notifications, role, limit = 4 }) {
  const items = Array.isArray(notifications.data) ? notifications.data : notifications.data?.items || [];
  return (
    <>
      <div className="gc-card-head"><h2 id={id}>Latest notifications</h2><Link className="gc-link gc-link--arrow" to="/portal/notifications">All notifications <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link></div>
      {notifications.loading ? <Loading /> : notifications.error ? <ErrorState message={notifications.error} retry={notifications.reload} /> : items.length ? (
        <ul className="gc-note-list">
          {items.slice(0, limit).map((note) => (
            <li key={note._id} className={note.read ? undefined : "is-unread"}>
              <Link to={note.deepLink || (note.claim ? `/portal/claims/${note.claim}` : "/portal/notifications")}>{describe(note.title, role)}</Link>
              <p>{describe(note.message, role)}</p>
              <span className="gc-note">{dateTime(note.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : <Empty title="You’re up to date" description="New notifications will appear here." />}
    </>
  );
}
