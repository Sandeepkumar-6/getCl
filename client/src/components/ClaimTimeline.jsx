import { Banknote, CircleDot, FileCheck2, FilePlus2, Gavel, History, Scale, Upload, UserCheck } from "lucide-react";
import { Empty, StatusChip, cx } from "./UI";
import { dateTime, label } from "../utils/format";
import { claimStatus, describe } from "../utils/status";

const ACTION_NAME = { DRAFT_CREATED: "Draft created", STATUS_CHANGED: "Status changed", DOCUMENT_UPLOADED: "Document added", DOCUMENT_REVIEWED: "Document checked", SURVEYOR_ASSIGNED: "Surveyor assigned", DECISION_RECORDED: "Decision recorded", APPEAL_SUBMITTED: "Appeal sent", PAYMENT_RECORDED: "Payment recorded" };
const ACTION_ICON = { DRAFT_CREATED: FilePlus2, DOCUMENT_UPLOADED: Upload, DOCUMENT_REVIEWED: FileCheck2, SURVEYOR_ASSIGNED: UserCheck, DECISION_RECORDED: Gavel, APPEAL_SUBMITTED: Scale, PAYMENT_RECORDED: Banknote };
const isStatusEntry = (t) => t.action === "STATUS_CHANGED" && t.newValue;

// Claim status history from the audit log, newest first. The latest entry that moved the claim
// into its current status is marked as the current step.
export default function ClaimTimeline({ entries = [], currentStatus, role, staff }) {
  if (!entries.length) return <Empty icon={History} title="No history yet" description={staff ? "Changes to this claim will be listed here with who made them and why." : "Each status change and document check on your claim will appear here."} />;
  const items = [...entries].reverse();
  const current = items.find((t) => isStatusEntry(t) && t.newValue === currentStatus);
  return (
    <ol className="gc-claim-timeline" aria-label="Claim history, newest first">
      {items.map((t) => {
        const status = isStatusEntry(t);
        const family = status ? claimStatus(t.newValue, role).family : "neutral";
        const Icon = status ? CircleDot : ACTION_ICON[t.action] || CircleDot;
        const isCurrent = t === current;
        return (
          <li key={t._id} className={cx(`gc-claim-timeline-item is-${family}`, status && "is-status", isCurrent && "is-current")} aria-current={isCurrent ? "step" : undefined}>
            <span className="gc-claim-timeline-marker" aria-hidden="true"><Icon className="gc-icon gc-icon--sm" /></span>
            <div className="gc-claim-timeline-body">
              <div className="gc-claim-timeline-head">
                {status ? <StatusChip status={t.newValue} role={role} /> : <strong>{ACTION_NAME[t.action] || label(t.action)}</strong>}
                {isCurrent && <span className="gc-claim-timeline-current">Current</span>}
              </div>
              {status && t.previousValue && <p className="gc-claim-timeline-from">From {claimStatus(t.previousValue, role).label}</p>}
              {t.note && <p className="gc-claim-timeline-note">{describe(t.note, role)}</p>}
              <p className="gc-claim-timeline-meta">
                <time dateTime={t.timestamp}>{dateTime(t.timestamp)}</time>
                <span aria-hidden="true"> · </span>
                <span>{t.actor?.name || "getClaim"}{staff && t.actorRole ? ` (${label(t.actorRole)})` : ""}</span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
