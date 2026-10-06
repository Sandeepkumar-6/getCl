import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Files, Plus, Search, X } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { Empty, ErrorState, Loading, PageHeader } from "../components/UI";
import { date, statuses } from "../utils/format";
import { claimStatus } from "../utils/status";
import ClaimTable from "../components/ClaimTable";
import Pagination from "../components/Pagination";
import { Stages } from "./Public";

// Filters that can arrive from links; each one must be visible as a chip.
const LINK_FILTERS = {
  sla: { breached: "Past due date" },
  assignment: { unassigned: "No surveyor yet" },
  documents: { pending: "Documents to check" },
  decision: { due: "Decision due in 24 hours" },
};

export default function Claims() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const staff = user.role !== "POLICYHOLDER";
  const admin = ["ADMIN", "SUPER_ADMIN"].includes(user.role);
  const result = useApi("/claims?" + params.toString(), { keepPrevious: true });
  const surveyors = useApi(admin ? "/admin/surveyors" : null);
  const [query, setQuery] = useState(params.get("search") || "");
  const first = useRef(true);

  const update = (changes, { replace = false } = {}) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) value ? next.set(key, value) : next.delete(key);
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace });
  };

  // Search waits for typing to stop and replaces the URL instead of adding history.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      if ((params.get("search") || "") !== query.trim()) update({ search: query.trim() }, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => { setQuery(params.get("search") || ""); }, [params]);

  const surveyorName = (id) => surveyors.data?.find?.((s) => s._id === id)?.name || "Selected surveyor";
  const chips = [
    params.get("search") && ["search", `“${params.get("search")}”`],
    params.get("status") && ["status", `Status: ${claimStatus(params.get("status"), user.role).label}`],
    params.get("date") && ["date", `Accident on ${date(params.get("date"))}`],
    params.get("surveyor") && ["surveyor", `Surveyor: ${surveyorName(params.get("surveyor"))}`],
    params.get("vehicleId") && ["vehicleId", "One vehicle"],
    params.get("policyId") && ["policyId", "One policy"],
    ...Object.entries(LINK_FILTERS).map(([key, values]) => params.get(key) && [key, values[params.get(key)] || `${key}: ${params.get(key)}`]),
  ].filter(Boolean);

  const clearAll = () => { setQuery(""); setParams({}); };
  const title = user.role === "SURVEYOR" ? "Assignments" : staff ? "Claim queue" : "Claims";
  const data = result.data;
  // Nothing to filter yet: skip the filter bar and let the empty state explain the next step.
  const nothingYet = data && data.total === 0 && !chips.length;
  return (
    <div className={staff ? "gc-next-claims gc-next-claims--staff" : "gc-next-claims"}>
      <PageHeader
        visual="claims"
        title={title}
        description={staff ? "Newest first. Open a claim to see its deadline and the actions available to you." : "Every claim you’ve filed, newest first. Claims that need you say so in amber."}
        action={!staff && <Link className="gc-btn" to={`/portal/claims/new${params.get("vehicleId") ? `?vehicleId=${encodeURIComponent(params.get("vehicleId"))}` : ""}`}><Plus className="gc-icon" aria-hidden="true" />File a claim</Link>}
      />
      {!nothingYet && <form className="gc-filters" role="search" aria-label="Filter claims" onSubmit={(e) => { e.preventDefault(); update({ search: query.trim() }); }}>
        <div className="gc-filter-controls">
          <div className="gc-field">
            <label className="gc-field-label" htmlFor="claim-search">Search</label>
            <div className="gc-search">
              <Search className="gc-icon" aria-hidden="true" />
              <input id="claim-search" className="gc-input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={staff ? "Claim number, name or registration" : "Claim number or registration"} />
            </div>
          </div>
          <div className="gc-field">
            <label className="gc-field-label" htmlFor="claim-status">Status</label>
            <select id="claim-status" className="gc-select" value={params.get("status") || ""} onChange={(e) => update({ status: e.target.value })}>
              <option value="">Any status</option>
              {statuses.map((s) => <option key={s} value={s}>{claimStatus(s, user.role).label}</option>)}
            </select>
          </div>
          <div className="gc-field">
            <label className="gc-field-label" htmlFor="claim-date">Accident date</label>
            <input id="claim-date" className="gc-input" type="date" value={params.get("date") || ""} onChange={(e) => update({ date: e.target.value })} />
          </div>
          {admin && (
            <div className="gc-field">
              <label className="gc-field-label" htmlFor="claim-surveyor">Surveyor</label>
              <select id="claim-surveyor" className="gc-select" value={params.get("surveyor") || ""} onChange={(e) => update({ surveyor: e.target.value })}>
                <option value="">Anyone</option>
                {(Array.isArray(surveyors.data) ? surveyors.data : []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="gc-field">
            <label className="gc-field-label" htmlFor="claim-sort">Sort</label>
            <select id="claim-sort" className="gc-select" value={params.get("sort") || "newest"} onChange={(e) => update({ sort: e.target.value === "newest" ? "" : e.target.value })}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
        <div className="gc-filter-active" aria-live="polite">
          {chips.length > 0 && <span>Showing</span>}
          {chips.map(([key, text]) => (
            <button key={key} type="button" className="gc-chip" aria-label={`Remove filter: ${text}`} onClick={() => { if (key === "search") setQuery(""); update({ [key]: "" }); }}>
              {text} <X className="gc-icon" aria-hidden="true" />
            </button>
          ))}
          {chips.length > 0 && <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={clearAll}>Clear all</button>}
          {data && <span className="gc-filter-count">{data.total} {data.total === 1 ? "claim" : "claims"}</span>}
        </div>
      </form>}
      {result.loading ? <Loading label="Loading claims…" /> : result.error && !data ? <ErrorState message={result.error} retry={result.reload} /> : (
        <div className={result.refreshing ? "gc-refreshing" : undefined} aria-busy={result.refreshing}>
          <ClaimTable
            claims={data?.items}
            role={user.role}
            label={title}
            empty={chips.length ? (
              <Empty level={2} icon={Search} title="No claims match these filters" description={`Showing: ${chips.map(([, t]) => t).join(", ")}.`} action={<button type="button" className="gc-btn gc-btn--secondary" onClick={clearAll}>Clear filters</button>} />
            ) : staff ? (
              <Empty level={2} icon={Files} title="Your queue is empty" description="Claims assigned to you or waiting for the claims team will appear here." />
            ) : (
              <Empty level={2} icon={Files} title="You haven’t filed a claim" description="If your vehicle was damaged or stolen, file a claim here. You can save it and finish later." action={<div className="gc-actions"><Link className="gc-btn" to="/portal/claims/new"><Plus className="gc-icon" aria-hidden="true" />File a claim</Link><Link className="gc-btn gc-btn--secondary" to="/portal/support">What you’ll need</Link></div>} />
            )}
          />
          {data?.total > 0 && <div className="gc-pagination-wrap"><Pagination data={data} noun="claims" onPage={(p) => update({ page: String(p) })} /></div>}
        </div>
      )}
      {nothingYet && !staff && (
        <section className="gc-card" aria-labelledby="how-claims-work">
          <div className="gc-card-head"><div><h2 id="how-claims-work">How a claim moves</h2><p>Every claim goes through the same five stages. Your claim page shows which one it’s at and who acts next.</p></div></div>
          <Stages level={3} />
        </section>
      )}
    </div>
  );
}
