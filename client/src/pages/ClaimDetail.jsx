import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, ClipboardCheck, Pencil } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { usePortalCrumb } from "../layouts/PortalLayout";
import { Alert, CopyButton, Empty, ErrorState, Facts, Loading, PageHeader, Plate, StatusChip, plateType } from "../components/UI";
import { ClaimJourney, NextStep } from "../components/Journey";
import Tabs, { TabPanel } from "../components/Tabs";
import Evidence from "../components/Evidence";
import { CustomerActions, StaffActions } from "../components/ClaimActions";
import { EstimatesSection, GrievanceSection, PaymentsSection, RepairSection, SettlementBreakdown } from "../components/ClaimWorkflow";
import { Readiness } from "../components/ClaimReadiness";
import VehicleImage from "../components/VehicleImage";
import ClaimTable from "../components/ClaimTable";
import ClaimTimeline from "../components/ClaimTimeline";
import { date, dateTime, humaniseText, label, money, phone } from "../utils/format";
import { claimStatus, describe, nextStepText } from "../utils/status";

const CLAIM_TYPE = { OWN_DAMAGE: "Damage to my vehicle", THIRD_PARTY: "Damage to someone else (third party)", THEFT: "Vehicle stolen", TOTAL_LOSS: "Total loss" };
const yesNo = (v) => (v ? "Yes" : "No");
const clock = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || "");
  if (!m) return hhmm || "—";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "am" : "pm"}`;
};

function nextFor(data, role, goTo) {
  const c = data.claim, workflow = data.workflow || {};
  const due = c.dueAt || workflow.dueAt;
  const surveyor = c.assignedSurveyor ? `${c.assignedSurveyor.name}, surveyor` : null;
  const handler = ["SURVEYOR_ASSIGNED", "INSPECTION_SCHEDULED"].includes(c.status) && surveyor ? surveyor : "Claims team";
  const decision = data.decisions?.[0];
  if (role === "POLICYHOLDER") {
    if (c.status === "DRAFT") return { tone: "action", title: "Finish and submit your claim", body: "Your draft is saved. Add what’s missing, accept the declaration and submit it.", action: { label: "Continue claim", to: `/portal/claims/${c._id}/edit`, icon: Pencil } };
    if (c.status === "MORE_INFORMATION_REQUIRED") {
      const request = [...(data.timeline || [])].reverse().find((t) => t.newValue === "MORE_INFORMATION_REQUIRED" && t.note);
      return { tone: "action", title: "Send the information the claims team asked for", body: request ? `“${describe(request.note)}”` : "Read the request, add anything missing in Documents, then reply.", meta: [["Due", due && date(due)], ["Asked by", "Claims team"]], action: { label: "Reply now", onClick: () => goTo("summary", "respond") } };
    }
    if (c.status === "REJECTED") return { tone: "action", eyebrow: "Decision", title: "Your claim was rejected. You can appeal.", body: decision?.reason ? `Reason given: ${decision.reason}` : "Read the reason in Decision and payout.", action: { label: "Appeal the decision", onClick: () => goTo("summary", "appeal") } };
    if (c.status === "READY_FOR_DELIVERY") return { tone: "action", title: "Your vehicle is ready to collect", body: "The repair is finished. Contact the garage to arrange collection." };
    if (c.status === "SETTLED") return { tone: "done", eyebrow: "Settled", title: "This claim is settled", body: decision ? `Payout: ${money(decision.payableAmount)}. Your records stay here.` : "Your records stay here." };
    return { tone: "waiting", title: nextStepText(c.status, role), body: c.breachedAt ? "This is taking longer than the deadline allows. You can raise a complaint in the History tab." : undefined, meta: [["Expected by", due && date(due)], ["Handled by", handler]] };
  }
  const info = claimStatus(c.status, role);
  return {
    tone: info.family === "action" ? "action" : c.status === "SETTLED" ? "done" : "waiting",
    eyebrow: info.family === "action" ? "Your move" : undefined,
    title: nextStepText(c.status, role),
    body: c.breachedAt || (due && new Date(due) < new Date() && !["SETTLED", "REJECTED"].includes(c.status)) ? "This claim is past its deadline." : undefined,
    meta: [["Due", due && dateTime(due)], ["Policyholder", c.policyholder?.name], ["Surveyor", c.assignedSurveyor?.name || (workflow.requiresSurvey ? "Not assigned yet" : "Not needed")]],
  };
}

export default function ClaimDetail({ initialTab = "summary" }) {
  const { id } = useParams();
  const { user } = useAuth();
  const role = user.role;
  const staff = role !== "POLICYHOLDER";
  const result = useApi("/claims/" + id);
  const [params] = useSearchParams();
  const [tab, setTab] = useState(["summary", "documents", "survey", "decision", "history"].includes(params.get("tab")) ? params.get("tab") : initialTab);
  usePortalCrumb(result.data?.claim?.claimNumber);
  if (result.loading) return <Loading label="Loading the claim…" />;
  if (result.error && !result.data) return <ErrorState message={result.error} retry={result.reload} />;
  const data = result.data;
  const { claim: c, documents, inspection, decisions, appeals, timeline, readiness, workflow = {} } = data;
  const a = c.accident || {};
  const editable = role === "POLICYHOLDER" && ["DRAFT", "MORE_INFORMATION_REQUIRED", "REJECTED", "APPEALED"].includes(c.status);
  const goTo = (nextTab, anchor) => {
    if (nextTab) setTab(nextTab);
    requestAnimationFrame(() => {
      const el = document.getElementById(anchor);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      (el?.querySelector("textarea, select, input, button") || el)?.focus?.({ preventScroll: true });
    });
  };
  const next = nextFor(data, role, goTo);
  const rejectedDocs = documents.filter((d) => d.verificationStatus === "REJECTED").length;
  const pendingDocs = documents.filter((d) => d.verificationStatus === "PENDING").length;
  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "documents", label: "Documents", count: staff ? pendingDocs : rejectedDocs || documents.length, needsViewer: staff ? pendingDocs > 0 : rejectedDocs > 0 },
    { id: "survey", label: "Survey" },
    { id: "decision", label: "Decision and payout" },
    { id: "history", label: "History" },
  ];
  const decision = decisions?.[0];
  const visibleTimeline = timeline.filter((t) => staff || ["DRAFT_CREATED", "STATUS_CHANGED", "DOCUMENT_REVIEWED"].includes(t.action));
  const pastDue = staff && (c.breachedAt || (c.dueAt && new Date(c.dueAt) < new Date() && !["SETTLED", "REJECTED", "DRAFT"].includes(c.status)));

  const main = (
    <div className="gc-stack-lg">
      <NextStep level={2} id="next-step-title" tone={next.tone} eyebrow={next.eyebrow} title={next.title} meta={next.meta} action={next.action}>{next.body}</NextStep>
      {staff && <StaffActions data={data} reload={result.reload} card />}
      <section className="gc-card" aria-labelledby="progress-title">
        <div className="gc-card-head"><h2 id="progress-title">Progress</h2></div>
        <ClaimJourney claim={c} role={role} survey={workflow.requiresSurvey} />
      </section>
      <Tabs label="Claim sections" tabs={tabs} selected={tab} onSelect={setTab} idPrefix="claim" />
      {tab === "summary" && (
        <TabPanel id="summary" idPrefix="claim">
          <div className="gc-stack-lg">
            <CustomerActions data={data} reload={result.reload} />
            {c.status === "DRAFT" && role === "POLICYHOLDER" && readiness && <Readiness readiness={readiness} />}
            {decision && (
              <section className="gc-card gc-payout-card" aria-labelledby="payout-summary">
                <div className="gc-card-head"><h2 id="payout-summary">Decision</h2><StatusChip status={decision.outcome} kind="decision" /></div>
                {decision.outcome === "APPROVED" ? <p className="gc-figure-line"><span className="gc-muted">{staff ? "Net payable" : "You receive"}</span><strong className="gc-figure">{money(decision.payableAmount)}</strong></p> : <p className="gc-body-text">{decision.reason}</p>}
                <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={() => setTab("decision")}>See how it was worked out <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></button>
              </section>
            )}
            {c.customerResponse && <Alert title={staff ? "Policyholder’s reply" : "Your reply"}>{c.customerResponse}</Alert>}
            <section className="gc-card" aria-labelledby="accident-title">
              <div className="gc-card-head"><h2 id="accident-title">What happened</h2></div>
              <Facts items={[
                ["Accident date", date(a.date)],
                ["Time", clock(a.time)],
                ["Place", a.location ? <>{a.location}{a.landmark && <small>{/^near\b/i.test(a.landmark) ? a.landmark : `Near ${a.landmark}`}</small>}</> : null],
                ["What happened", a.type],
                ["Claim type", CLAIM_TYPE[c.claimType] || label(c.claimType)],
                ["How the repair is paid", a.claimType === "Cashless" ? "Cashless at a network garage" : a.claimType === "Reimbursement" ? "Paid by you, then claimed back" : a.claimType],
                ["Weather", a.weather],
                ["Road", a.road],
                ["Vehicle can be driven", yesNo(a.driveable)],
                ["Anyone injured", yesNo(a.injury)],
                ["Another party involved", yesNo(a.thirdParty)],
                ["Estimated loss", c.estimatedLoss ? money(c.estimatedLoss) : "Not given"],
                ["Description", a.description, true],
              ]} />
            </section>
            {(a.injury || a.thirdParty) && (
              <section className="gc-card" aria-labelledby="police-title">
                <div className="gc-card-head"><h2 id="police-title">Police and the other party</h2></div>
                <Facts items={[
                  ["FIR or diary number", c.police?.number],
                  ["Police station", c.police?.station],
                  ["Report date", c.police?.date ? date(c.police.date) : null],
                  a.thirdParty && ["Other party’s name", c.thirdParty?.name],
                  a.thirdParty && ["Their vehicle", c.thirdParty?.registration ? <Plate registration={c.thirdParty.registration} /> : null],
                  a.thirdParty && ["Their mobile", phone(c.thirdParty?.phone)],
                  a.injury && ["Injuries", c.thirdParty?.injuryDescription, true],
                ]} />
              </section>
            )}
            <section className="gc-card" aria-labelledby="people-title">
              <div className="gc-card-head"><div><h2 id="people-title">Policy and people</h2><p>The cover this claim relies on, and who to contact at each stage.</p></div></div>
              <Facts items={[
                ["Insurer", c.policy?.insurer],
                ["Policy number", <span className="gc-ref" key="p">{c.policy?.policyNumber}</span>],
                ["Cover", `${c.policy?.coverageType || "—"} · ${date(c.policy?.startDate)} to ${date(c.policy?.expiryDate)}`],
                staff && ["Policyholder", <>{c.policyholder?.name}<small>{[c.policyholder?.email, phone(c.policyholder?.phone)].filter(Boolean).join(" · ")}</small></>],
                ["Surveyor", c.assignedSurveyor ? <>{c.assignedSurveyor.name}<small>{[c.assignedSurveyor.email, phone(c.assignedSurveyor.phone)].filter(Boolean).join(" · ")}</small></> : workflow.requiresSurvey ? "Assigned after review" : "Not needed for this claim"],
                ["Claims team", <>getClaim claims team<small>getclaimedhelp@gmail.com</small></>],
              ]} />
            </section>
          </div>
        </TabPanel>
      )}
      {tab === "documents" && (
        <TabPanel id="documents" idPrefix="claim">
          {editable && rejectedDocs > 0 && <Alert tone="warning" title={`${rejectedDocs} document${rejectedDocs > 1 ? "s need" : " needs"} replacing`}>The reason is shown under each file.</Alert>}
          <Evidence claimId={id} documents={documents} required={workflow.requiredDocuments || []} editable={editable} reviewable={staff} onChange={result.reload} />
        </TabPanel>
      )}
      {tab === "survey" && (
        <TabPanel id="survey" idPrefix="claim">
          <section className="gc-card" aria-labelledby="survey-title">
            <div className="gc-card-head"><h2 id="survey-title">Inspection and assessment</h2></div>
            {inspection ? (
              <div className="gc-stack-lg">
                <Facts items={[
                  ["Booked for", dateTime(inspection.scheduledDate)],
                  ["Where", inspection.inspectionLocation],
                  ["Damage seen", inspection.damageSummary || "Report not submitted yet", true],
                  ["Affected parts", inspection.affectedParts?.join(", ") || "Report not submitted yet", true],
                ]} />
                {inspection.submittedAt && (
                  <>
                    <dl className="gc-ledger">
                      <div><dt>Parts</dt><dd>{money(inspection.partsCost)}</dd></div>
                      <div><dt>Labour</dt><dd>{money(inspection.labourCost)}</dd></div>
                      <div><dt>Tax</dt><dd>{money(inspection.taxAmount)}</dd></div>
                      <div className="is-total is-neutral"><dt>Estimated repair cost</dt><dd>{money(inspection.estimatedRepairCost)}</dd></div>
                    </dl>
                    {inspection.notes && <p className="gc-body-text">{inspection.notes}</p>}
                    <p className="gc-note">This is the surveyor’s assessment, not a garage quotation. The recorded settlement is final.</p>
                  </>
                )}
              </div>
            ) : (
              <Empty icon={ClipboardCheck} title={workflow.requiresSurvey ? "No inspection booked yet" : "This claim doesn’t need a survey"} description={workflow.requiresSurvey ? "The surveyor books the inspection once they’re assigned." : "Losses under ₹50,000 are assessed by the claims team without a site inspection."} />
            )}
          </section>
        </TabPanel>
      )}
      {tab === "decision" && (
        <TabPanel id="decision" idPrefix="claim">
          <div className="gc-stack-lg">
            <section className="gc-card" aria-labelledby="decision-title">
              <div className="gc-card-head"><h2 id="decision-title">Decision</h2></div>
              {decisions.length ? (
                <ul className="gc-record-list">
                  {decisions.map((d) => (
                    <li key={d._id}>
                      <div className="gc-record-head"><StatusChip status={d.outcome} kind="decision" /><span className="gc-note">{dateTime(d.decidedAt)}</span></div>
                      <p>{d.reason}</p>
                      <p className="gc-note">Policy clause relied on (sample): {d.policyClause}</p>
                      {d.outcome === "APPROVED" && (
                        <dl className="gc-ledger">
                          <div><dt>Approved amount</dt><dd>{money(d.approvedAmount)}</dd></div>
                          <div className="is-deduction"><dt>Deductible</dt><dd>− {money(d.deductible)}</dd></div>
                          <div className="is-total"><dt>{staff ? "Net payable" : "You receive"}</dt><dd>{money(d.payableAmount)}</dd></div>
                        </dl>
                      )}
                    </li>
                  ))}
                </ul>
              ) : <p className="gc-body-text">The decision appears here after {workflow.requiresSurvey ? "the survey and " : ""}the claims team’s review.</p>}
              {appeals.length > 0 && (
                <>
                  <h3 className="gc-subhead">Appeals</h3>
                  <ul className="gc-record-list">
                    {appeals.map((ap) => (
                      <li key={ap._id}>
                        <div className="gc-record-head"><strong>Appeal sent {date(ap.submittedAt)}</strong><StatusChip status={ap.status} kind="appeal" /></div>
                        <p>{ap.reason}</p>
                        {ap.supportingInformation && <p className="gc-muted">{ap.supportingInformation}</p>}
                        {ap.reviewNote && <p><strong>Review:</strong> {ap.reviewNote}</p>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="gc-note">An appeal here doesn’t replace your insurer’s formal grievance process. See Complaints in the History tab.</p>
            </section>
            <section className="gc-card" aria-labelledby="settlement-title">
              <div className="gc-card-head"><h2 id="settlement-title">How the payout is worked out</h2></div>
              <SettlementBreakdown settlement={data.settlement} total={staff ? "Net payable" : "You receive"} />
            </section>
            <PaymentsSection data={data} reload={result.reload} />
            <EstimatesSection data={data} reload={result.reload} />
            <RepairSection data={data} reload={result.reload} />
          </div>
        </TabPanel>
      )}
      {tab === "history" && (
        <TabPanel id="history" idPrefix="claim">
          <div className="gc-stack-lg">
            <section className="gc-card" aria-labelledby="history-title">
              <div className="gc-card-head"><div><h2 id="history-title">{staff ? "Audit history" : "History"}</h2><p>{staff ? "Every change with who made it, when and why." : "Status changes and document checks on your claim."}</p></div></div>
              <ClaimTimeline entries={visibleTimeline} currentStatus={c.status} role={role} staff={staff} />
            </section>
            <GrievanceSection data={data} reload={result.reload} />
          </div>
        </TabPanel>
      )}
      <RelatedClaims vehicle={c.vehicle} currentId={c._id} role={role} />
    </div>
  );

  return (
    <>
      <PageHeader
        visual="claims"
        title={`Claim ${c.claimNumber}`}
        meta={<>
          <StatusChip status={c.status} role={role} />
          {pastDue && <StatusChip status="PAST_DUE" family="critical" label="Past due date" />}
          <Plate registration={c.vehicle?.registrationNumber} type={plateType(c.vehicle)} />
          <span className="gc-muted">{[c.vehicle?.manufacturer, c.vehicle?.model, c.vehicle?.manufacturingYear].filter(Boolean).join(" ")}</span>
        </>}
        description={staff ? `Filed by ${c.policyholder?.name || "the policyholder"}${c.submittedAt ? ` on ${date(c.submittedAt)}` : ""}.` : c.submittedAt ? `Filed on ${date(c.submittedAt)}.` : "Not submitted yet."}
        action={<>
          <CopyButton value={c.claimNumber} label="Copy claim number" />
          {c.status === "DRAFT" && role === "POLICYHOLDER" && <Link className="gc-btn" to={`/portal/claims/${id}/edit`}><Pencil className="gc-icon" aria-hidden="true" />Continue claim</Link>}
        </>}
      />
      <div className="gc-claim-layout">
        {main}
        <Glance data={data} role={role} />
      </div>
    </>
  );
}

// Persistent context beside the tabs: the vehicle, cover, deadline, documents and payout.
function Glance({ data, role }) {
  const c = data.claim;
  const staff = role !== "POLICYHOLDER";
  const workflow = data.workflow || {};
  const required = workflow.requiredDocuments || [];
  const received = required.filter((t) => data.documents.some((d) => d.documentType === t && d.verificationStatus !== "REJECTED")).length;
  const decision = data.decisions?.[0];
  const due = c.dueAt || workflow.dueAt;
  const closed = ["SETTLED", "REJECTED"].includes(c.status);
  return (
    <aside className="gc-claim-aside" aria-label="Claim at a glance">
      <section className="gc-card gc-glance">
        <VehicleImage vehicle={c.vehicle} size="card" />
        <div className="gc-glance-id">
          <Plate registration={c.vehicle?.registrationNumber} type={plateType(c.vehicle)} />
          <span>{[c.vehicle?.manufacturer, c.vehicle?.model].filter(Boolean).join(" ")}</span>
        </div>
        <Facts columns={1} items={[
          ["Accident", c.accident?.date ? `${date(c.accident.date)}${c.accident?.location ? ` · ${c.accident.location}` : ""}` : "Date not recorded"],
          ["Policy", <>{c.policy?.insurer}<small className="gc-ref">{c.policy?.policyNumber}</small></>],
          ["Cover until", date(c.policy?.expiryDate)],
          staff && ["Policyholder", <>{c.policyholder?.name}<small>{phone(c.policyholder?.phone)}</small></>],
          ["Surveyor", c.assignedSurveyor?.name || (workflow.requiresSurvey ? "Not assigned yet" : "Not needed")],
          !closed && ["Next deadline", due ? dateTime(due) : "None set"],
        ]} />
        <div className="gc-glance-docs">
          <div className="gc-glance-row"><span>Required documents</span><strong>{received} of {required.length}</strong></div>
          <div className="gc-progress" role="progressbar" aria-label="Required documents received" aria-valuemin={0} aria-valuemax={required.length} aria-valuenow={received}><span style={{ width: `${required.length ? (received / required.length) * 100 : 0}%` }} /></div>
        </div>
        {decision && (
          <div className={`gc-glance-decision ${decision.outcome === "APPROVED" ? "is-positive" : "is-critical"}`}>
            <span>{decision.outcome === "APPROVED" ? (staff ? "Net payable" : "You receive") : "Decision"}</span>
            <strong>{decision.outcome === "APPROVED" ? money(decision.payableAmount) : "Rejected"}</strong>
          </div>
        )}
      </section>
    </aside>
  );
}

// Other claims on the same vehicle: history the reader may need when judging this one.
function RelatedClaims({ vehicle, currentId, role }) {
  const result = useApi(vehicle?._id ? `/claims?vehicleId=${vehicle._id}` : null);
  const others = (result.data?.items || []).filter((c) => c._id !== currentId).map((c) => ({ ...c, vehicle }));
  if (result.loading || !others.length) return null;
  return (
    <section aria-labelledby="related-title" className="gc-stack">
      <div className="gc-card-head gc-section-head">
        <h2 id="related-title">Other claims on this vehicle</h2>
        {others.length > 4 && <Link className="gc-link gc-link--arrow" to={`/portal/claims?vehicleId=${vehicle._id}`}>All {others.length} <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link>}
      </div>
      <ClaimTable claims={others.slice(0, 4)} role={role} hideVehicle label="Other claims on this vehicle" />
    </section>
  );
}
