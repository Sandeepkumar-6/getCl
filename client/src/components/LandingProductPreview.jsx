import { Camera } from "lucide-react";
import { Plate, StatusChip } from "./UI";
import { ClaimJourney, NextStep } from "./Journey";

// A static sample claim for the public home page. No personal records and no API requests.
const sample = { status: "MORE_INFORMATION_REQUIRED", submittedAt: "2026-09-22T08:00:00+05:30", dueAt: "2026-09-29T18:00:00+05:30", assignedSurveyor: null, estimatedLoss: 3_200_000 };

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
        <NextStep level={2} tone="action" title="Upload a clear photo of the number plate" meta={[["Due", "29 Sep 2026"], ["Asked by", "Claims team"]]} action={{ label: "Upload photo", icon: Camera, onClick: () => {} }}>
          The plate isn’t readable in the front damage photo.
        </NextStep>
        <ClaimJourney claim={sample} role="POLICYHOLDER" survey={false} label="Sample claim progress" />
      </div>
      <figcaption>Sample claim, not a real record</figcaption>
    </figure>
  );
}
