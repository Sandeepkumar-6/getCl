import { Camera } from "lucide-react";
import { Plate, StatusChip } from "./UI";
import { ClaimJourney, NextStep } from "./Journey";

// A static sample claim for the public home page. No personal records and no API requests.
const submittedAt = new Date();
submittedAt.setDate(submittedAt.getDate() - 3);
const dueAt = new Date();
dueAt.setDate(dueAt.getDate() + 4);
const sample = { status: "MORE_INFORMATION_REQUIRED", submittedAt: submittedAt.toISOString(), dueAt: dueAt.toISOString(), assignedSurveyor: null, estimatedLoss: 3_200_000 };
const dueLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(dueAt);

export default function LandingProductPreview() {
  return (
    <figure className="gc-sample" aria-label="Sample claim as a policyholder sees it: status, next step and the five claim stages.">
      <div className="gc-sample-card" aria-hidden="true" inert>
        <div className="gc-sample-head">
          <div>
            <span className="gc-ref">GC-2026-01043</span>
            <div className="gc-sample-meta"><Plate registration="MH48AB4821" /><span>Tata Nexon</span></div>
          </div>
          <StatusChip status="MORE_INFORMATION_REQUIRED" role="POLICYHOLDER" />
        </div>
        <NextStep level={2} tone="action" title="Upload a clear photo of the number plate" meta={[["Due", dueLabel], ["Asked by", "Claims team"]]} action={{ label: "Upload photo", icon: Camera, onClick: () => {} }}>
          The plate isn’t readable in the front damage photo.
        </NextStep>
        <ClaimJourney claim={sample} role="POLICYHOLDER" survey={false} label="Sample claim progress" />
      </div>
      <figcaption>Sample claim, not a real record</figcaption>
    </figure>
  );
}
