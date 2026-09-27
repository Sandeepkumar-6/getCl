# getClaim rules register

Checked: **2026-09-21**. This is the short implementation register. Full evidence and conflicts are in [research.md](./research.md). Values are centralized in `server/src/config/rules.js`.

## Controlling principles

1. Store money as integer paise. Display rupees only at the UI boundary.
2. The issued policy wording and schedule override sample product defaults.
3. Do not block claim intimation because a document is absent. Ask only for documents relevant to the claim and explain what can follow later.
4. A value marked **UNVERIFIED** must be configurable. If it affects money, the UI must show: **“Sample value, not legal advice. Confirm against the issued policy.”**
5. Dates and clocks use calendar time unless the controlling text expressly says otherwise.

## Executable rules

| Key | Value | Authority / date | Confidence |
| --- | --- | --- | --- |
| `survey.mandatoryMotorLossThresholdPaise` | `5_000_000` (₹50,000), inclusive | [IRDAI master circular](https://irdai.gov.in/document-detail?documentId=5625747), effective 2024-09-05; checked 2026-09-21 | Confirmed by primary source |
| `claimSla.surveyorAllocationHours` | 24 | Same, Part V.4.2 | Confirmed by primary source |
| `claimSla.surveyReportDays` | 15 from allocation | Same, Part V.4.4 | Confirmed by primary source |
| `claimSla.surveyorDelayCompensationPaisePerDay` | `50_000` (₹500/day) | Same, Part V.4.4 | Confirmed by primary source |
| `claimSla.insurerDecisionDays` | 7 | Same, Part V.4.5 | Confirmed by primary source |
| `claimSla.insurerDecisionClock` | Earlier of report receipt or 15 days after allocation | Same, Part V.4.5 | Confirmed by primary source |
| `claimSla.delayedClaimInterestAboveBankRatePercentagePoints` | 2 | Same, Part V.3.2 | Confirmed by primary source |
| `settlement.constructiveTotalLossRepairToIdvPercent` | 75 | [Current ICICI wording](https://www.icicilombard.com/docs/default-source/default-document-library/private-car-package-policy-wording.pdf), published 2025; checked 2026-09-21 | Confirmed for product wording |
| `grievance.insurerResolutionDays` | 14 | IRDAI master circular, Part VI.2 | Confirmed by primary source |
| `grievance.ombudsmanMaximumClaimPaise` | `5_000_000_000` (₹50 lakh) | IRDAI master circular, Part VI.3 | Confirmed by primary source |
| `grievance.insurerAwardComplianceDays` | 30 | IRDAI master circular, Part VI.4 | Confirmed by primary source |
| `grievance.awardDelayPenaltyPaisePerDay` | `500_000` (₹5,000/day) | IRDAI master circular, Part VI.4 | Confirmed by primary source |
| `privacy.securityAndProcessingLogMinimumDays` | 365 | [DPDP Rules 2025, rules 6 and 8](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf), gazetted 2025-11-14; checked 2026-09-21 | Confirmed; scheduled to commence 2027-05-14 |
| `privacy.boardDetailedBreachReportHours` | 72 | Same, rule 7 | Confirmed; scheduled to commence 2027-05-14 |

## Product-wording profiles

These values are supported by current insurer policy wording but must be replaced by each issued policy's terms. Their use as a generic default is **UNVERIFIED**.

### Deductibles and NCB

| Value | Default | Source / date | Confidence |
| --- | ---: | --- | --- |
| Private car ≤1500 cc compulsory deductible | ₹1,000 | [ICICI wording](https://www.icicilombard.com/docs/default-source/default-document-library/private-car-package-policy-wording.pdf), published 2025; checked 2026-09-21 | Product-confirmed; universal use **UNVERIFIED** |
| Private car >1500 cc compulsory deductible | ₹2,000 | Same | Product-confirmed; universal use **UNVERIFIED** |
| Two-wheeler compulsory deductible | ₹100 | [IRDAI motor guidance](https://irdai.gov.in/web/policy-holder/motor-insurance), current at check | Confirmed; verify policy |
| Voluntary options | ₹2,500 / ₹5,000 / ₹7,500 / ₹15,000 | ICICI wording, published 2025 | Product-confirmed; universal use **UNVERIFIED**, configurable with `VOLUNTARY_DEDUCTIBLE_OPTIONS_PAISE` |
| Annual NCB after 1–5+ claim-free years | 20 / 25 / 35 / 45 / 50% | [HDFC ERGO](https://www.hdfcergo.com/car-insurance/no-claim-bonus), current at check | Product-confirmed; multi-year/add-ons may differ |

### Depreciation

Source for both tables: [Tata AIG base policy wording](https://www.tataaig.com/s3/Auto_Secure_Private_Car_Package_Base_Policy_Wording_31ed1ddc55.pdf), current and checked 2026-09-21. Confidence: confirmed by primary insurer wording; generic use is **UNVERIFIED** until matched to the policy.

| Material | Percent |
| --- | ---: |
| Rubber/nylon/plastic/tyres/tubes/batteries | 50 |
| Fibre glass | 30 |
| Glass | 0 |
| Painting material | 50 |
| Material share of consolidated painting charge | 25 |

| Vehicle age for other parts | Percent |
| --- | ---: |
| ≤6 months | 0 |
| >6–12 months | 5 |
| >1–2 years | 10 |
| >2–3 years | 15 |
| >3–4 years | 25 |
| >4–5 years | 35 |
| >5–10 years | 40 |
| >10 years | 50 |

IDV depreciation is a separate schedule: 5 / 15 / 20 / 30 / 40 / 50% for ≤6 months, >6–12 months, >1–2, >2–3, >3–4 and >4–5 years. Above five years or for an obsolete model, use the value agreed between insurer and insured.

## Claim-type document rules

| Claim type | FIR | Other required/relevant evidence | Status |
| --- | --- | --- | --- |
| Own damage | Conditional: third-party injury/damage, bodily injury, malicious act, major accident, or insurer/police direction | Policy, RC, DL, estimate, photos; invoice/receipt for reimbursement | Confirmed by current insurer forms/pages |
| Third party | Required | Policy, RC, DL, FIR, third-party/MACT notices and medical/repair evidence | Confirmed by current insurer forms/pages |
| Theft | Required | Policy, RC, keys, FIR, final/untraced report, RTO forms, financier NOC if applicable | Confirmed by current insurer forms/pages |
| Fire | Conditional; do not create a universal blocking gate | Photos, fire-brigade report where applicable, estimate/invoice | **UNVERIFIED** as a universal FIR rule |
| Flood | Conditional; no universal FIR rule found | Photos, inspection, estimate/invoice | **UNVERIFIED** as a universal FIR rule |

Sources: [IRDAI master circular](https://irdai.gov.in/document-detail?documentId=5625747), [ICICI claim form](https://www.icicilombard.com/docs/default-source/other-documents/motor_claim_form.pdf), and [HDFC claim form](https://www.hdfcergo.com/documents/crosslink/HDFC%20Motor%20Claim%20Form.pdf); checked 2026-09-21.

## Configurable UNVERIFIED defaults

| Setting | Default | Configuration | Reason |
| --- | ---: | --- | --- |
| On-account payment | 50% of estimate | `ON_ACCOUNT_PAYMENT_PERCENT` | No current regulator-set percentage located |
| Voluntary deductible options | ₹2,500 / ₹5,000 / ₹7,500 / ₹15,000 | `VOLUNTARY_DEDUCTIBLE_OPTIONS_PAISE`, comma-separated paise | Product-specific rather than universal |
| Surveyor class exemptions | None | Future explicit rules only | No current blanket class-exemption order located |

## Conflicts resolved

- **Claim decision 7 vs 30 days:** use 7 days from the 2024 master circular. The 30-day statement belongs to the older regime or the Ombudsman no-response path.
- **Survey threshold wording:** use `>= ₹50,000`; the circular's awkward phrase is clarified by the Government summary that only losses below ₹50,000 avoid mandatory survey.
- **Grievance 14 vs 15 vs 30 days:** breach the insurer SLA at 14 days. Bima Bharosa's public page says 15 days. The Ombudsman Rules permit a no-reply filing after one month; an unsatisfactory decision can be escalated when received.
- **Fire FIR:** collect it when applicable and requested, but do not reject or prevent intimation solely because it is absent.

