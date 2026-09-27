import { Link } from "react-router-dom";
import { ChevronRight, Files } from "lucide-react";
import { Empty, Plate, StatusChip, cx, plateType } from "./UI";
import { dateShort } from "../utils/format";
import { needsPolicyholder, nextStepText } from "../utils/status";

const pastDue = (c) => Boolean(c.breachedAt || (c.dueAt && new Date(c.dueAt) < new Date() && !["SETTLED", "REJECTED", "DRAFT"].includes(c.status)));

// Claims for policyholders, or the queue for staff. Each row is one link; rows stack below 720px of container width.
export default function ClaimTable({ claims, role = "POLICYHOLDER", empty, label = "Claims", hideVehicle = false }) {
  const staff = role !== "POLICYHOLDER";
  if (!claims?.length)
    return empty || <Empty icon={Files} title="No claims to show" description={staff ? "Claims that reach your queue will appear here." : "Claims you file will appear here."} />;
  return (
    <div className={cx("gc-claims", staff && "gc-claims--staff")}>
      <div className="gc-claims-head" aria-hidden="true">
        <span>Claim</span>
        {staff && <span>Policyholder</span>}
        <span>Status</span>
        {staff && <span>Assigned to</span>}
        <span>Next step</span>
        <span>{staff ? "Due" : "Updated"}</span>
        <span />
      </div>
      <ul className="gc-claims-list" aria-label={label}>
        {claims.map((c) => {
          const yours = !staff && needsPolicyholder(c.status);
          return (
            <li key={c._id}>
              <Link className="gc-claim-row" to={`/portal/claims/${c._id}`}>
                <span className="gc-claim-id">
                  <span className="gc-ref">{c.claimNumber}</span>
                  {!hideVehicle && (
                    <span className="gc-claim-veh">
                      <Plate registration={c.vehicle?.registrationNumber} type={plateType(c.vehicle)} />
                      <span>{[c.vehicle?.manufacturer, c.vehicle?.model].filter(Boolean).join(" ")}</span>
                    </span>
                  )}
                </span>
                {staff && <span className="gc-claim-person"><span className="gc-claim-label">Policyholder </span>{c.policyholder?.name || "—"}</span>}
                <span className="gc-claim-status">
                  <StatusChip status={c.status} role={role} />
                  {staff && pastDue(c) && <StatusChip status="PAST_DUE" family="critical" label="Past due date" />}
                </span>
                {staff && <span className="gc-claim-person"><span className="gc-claim-label">Assigned to </span>{c.assignedSurveyor?.name || <span className="gc-muted">Unassigned</span>}</span>}
                <span className={cx("gc-claim-next", yours && "is-yours")}>{nextStepText(c.status, role)}</span>
                <span className="gc-claim-when">
                  <span className="gc-claim-label">{staff ? "Due " : "Updated "}</span>
                  {staff ? (c.dueAt ? dateShort(c.dueAt) : "—") : dateShort(c.updatedAt || c.createdAt)}
                </span>
                <ChevronRight className="gc-icon" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
