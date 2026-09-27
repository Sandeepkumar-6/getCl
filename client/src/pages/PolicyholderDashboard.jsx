import { Link } from "react-router-dom";
import { ArrowRight, Files, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useVehicleWorkspace } from "../hooks/useVehicleWorkspace";
import { useApi } from "../hooks/useApi";
import { Empty, ErrorState, Loading, PageHeader } from "../components/UI";
import { NextStep } from "../components/Journey";
import ClaimTable from "../components/ClaimTable";
import { VehicleSwitcher, VehicleWorkspaceGate } from "../components/VehicleWorkspace";
import { ActivityTimeline, CareSummary, DocumentList, PolicySummary, ReminderList, SectionHeading, VehicleIdentity } from "../components/VehicleOverviewPanels";
import { currentPolicy, vehicleReminders } from "../utils/vehicleWorkspace";
import { date, greeting } from "../utils/format";
import { isOpenClaim } from "../utils/status";

function WaitingOnYou({ claim }) {
  const vehicle = [claim.vehicle?.manufacturer, claim.vehicle?.model].filter(Boolean).join(" ");
  if (claim.status === "DRAFT")
    return <NextStep level={2} tone="action" title={`Finish your claim for the ${vehicle || "vehicle"}`} meta={[["Draft", <span className="gc-ref" key="r">{claim.claimNumber}</span>]]} action={{ label: "Continue claim", to: `/portal/claims/${claim._id}/edit` }}>Your draft is saved. Add what’s missing and submit it.</NextStep>;
  if (claim.status === "READY_FOR_DELIVERY")
    return <NextStep level={2} tone="action" title={`Collect your ${vehicle || "vehicle"}`} meta={[["Claim", <span className="gc-ref" key="r">{claim.claimNumber}</span>]]} action={{ label: "Open claim", to: `/portal/claims/${claim._id}` }}>The repair for this claim is finished.</NextStep>;
  return <NextStep level={2} tone="action" title="Send the information the claims team asked for" meta={[["Claim", <span className="gc-ref" key="r">{claim.claimNumber}</span>], ["Due", claim.dueAt ? date(claim.dueAt) : null]]} action={{ label: "See the request", to: `/portal/claims/${claim._id}` }}>Your claim for the {vehicle || "vehicle"} is paused until you reply.</NextStep>;
}

export default function PolicyholderDashboard() {
  const { user } = useAuth();
  const workspace = useVehicleWorkspace();
  const claims = useApi("/claims");
  const items = claims.data?.items || [];
  const waiting = items.filter((c) => ["DRAFT", "MORE_INFORMATION_REQUIRED", "READY_FOR_DELIVERY"].includes(c.status)).sort((a, b) => (a.status === "MORE_INFORMATION_REQUIRED" ? -1 : 1) - (b.status === "MORE_INFORMATION_REQUIRED" ? -1 : 1));
  const open = items.filter((c) => isOpenClaim(c.status));
  return (
    <>
      <PageHeader
        title={greeting(user.name)}
        description={waiting.length ? `${waiting.length === 1 ? "One thing needs" : `${waiting.length} things need`} you. Everything else is below.` : "Nothing needs you right now. Here’s where things stand."}
        action={<Link className="gc-btn" to={`/portal/claims/new${workspace.selected ? `?vehicleId=${workspace.selected._id}` : ""}`}><Plus className="gc-icon" aria-hidden="true" />File a claim</Link>}
      />
      {claims.loading ? <Loading label="Loading your claims…" /> : claims.error ? <ErrorState message={claims.error} retry={claims.reload} /> : (
        <>
          {waiting.length > 0 && <section className="gc-stack" aria-label="Waiting on you">{waiting.slice(0, 3).map((c) => <WaitingOnYou key={c._id} claim={c} />)}</section>}
          <section aria-labelledby="open-claims" className="gc-stack">
            <div className="gc-card-head gc-section-head">
              <h2 id="open-claims">Open claims</h2>
              <Link className="gc-link gc-link--arrow" to="/portal/claims">All claims <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link>
            </div>
            <ClaimTable
              claims={open.slice(0, 5)}
              label="Open claims"
              empty={items.length ? (
                <Empty icon={Files} title="No open claims" description="Your settled, rejected and draft claims are in your claim history." action={<Link className="gc-btn gc-btn--secondary" to="/portal/claims">See claim history</Link>} />
              ) : (
                <Empty icon={Files} title="You haven’t filed a claim" description="If your vehicle was damaged or stolen, file a claim here. You can save it and finish later." action={<Link className="gc-btn" to="/portal/claims/new"><Plus className="gc-icon" aria-hidden="true" />File a claim</Link>} />
              )}
            />
          </section>
        </>
      )}
      <section aria-labelledby="your-vehicle" className="gc-stack-lg">
        <h2 id="your-vehicle" className="gc-section-head-title">Your vehicle</h2>
        <VehicleWorkspaceGate workspace={workspace}>
          <VehicleSwitcher workspace={workspace} />
          {workspace.selected && <DashboardOverview key={workspace.selected._id} vehicleId={workspace.selected._id} />}
        </VehicleWorkspaceGate>
      </section>
    </>
  );
}

function DashboardOverview({ vehicleId }) {
  const result = useApi(`/vehicles/${vehicleId}/care`);
  if (result.loading) return <Loading label="Loading vehicle details…" />;
  if (result.error) return <ErrorState message={result.error} retry={result.reload} />;
  const data = result.data;
  const reminders = vehicleReminders(data);
  return (
    <>
      <div className="gc-grid-2 gc-grid-vehicle">
        <VehicleIdentity data={data} />
        <PolicySummary policy={currentPolicy(data.policies)} vehicle={data.vehicle} />
      </div>
      <div className="gc-grid-2">
        <section className="gc-card" aria-labelledby="home-reminders">
          <SectionHeading id="home-reminders" title="Reminders" to={`/portal/reminders?vehicleId=${vehicleId}`} />
          <ReminderList reminders={reminders} vehicle={data.vehicle} limit={4} onChange={result.reload} />
          {reminders.length > 4 && <p className="gc-note">{reminders.length - 4} more in Reminders</p>}
        </section>
        <CareSummary data={data} />
      </div>
      <div className="gc-grid-2">
        <section className="gc-card" aria-labelledby="home-docs">
          <SectionHeading id="home-docs" title="Documents" to={`/portal/documents?vehicleId=${vehicleId}`} />
          <DocumentList documents={data.documentLibrary || []} limit={4} emptyAction={<Link className="gc-btn gc-btn--secondary gc-btn--sm" to={`/portal/vehicles/${vehicleId}?action=document`}>Upload a document</Link>} />
        </section>
        <section className="gc-card" aria-labelledby="home-activity">
          <SectionHeading id="home-activity" title="Recent activity" to={`/portal/vehicles/${vehicleId}#timeline`} action="Vehicle history" />
          <ActivityTimeline timeline={data.timeline} limit={5} />
        </section>
      </div>
    </>
  );
}
