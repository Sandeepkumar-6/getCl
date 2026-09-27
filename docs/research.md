# getClaim Phase 0 research

Checked: **2026-09-21**  
Jurisdiction: India  
Purpose: product and engineering research for a college prototype. This is not legal advice. The issued policy schedule and wording control each real claim.

## Source and interpretation policy

Primary sources were preferred: IRDAI and Government of India publications, Acts on India Code, the Council for Insurance Ombudsmen, and current insurer policy wordings. Insurer product values are useful defaults, but are not represented as universal law. Every monetary amount stored by the application must be integer paise.

The browser automation surface was unavailable during this phase, so research used direct web access and locally extracted official PDFs. No application data, credentials, `.env` content, or user documents were sent outside the workspace.

Confidence labels used below:

- **Confirmed by primary source**: current regulator, statute, ministry, CIO, or current insurer policy wording.
- **Secondary only**: a non-controlling explainer; no rule below relies solely on one.
- **UNVERIFIED**: no controlling current source was found, or a product-specific figure would be unsafe as a universal default.

## 1. Claim handling and survey SLAs

The controlling source is IRDAI's *Master Circular on Protection of Policyholders' Interests 2024*, reference `IRDAI/PP&GR/CIR/MISC/117/9/2024`, issued and effective immediately on **2024-09-05**. The relevant provisions are Part V paragraphs 1–4 and Schedule A. [IRDAI document page](https://irdai.gov.in/document-detail?documentId=5625747)

| Rule | Value chosen | Publication/effective date | Checked | Confidence |
| --- | --- | --- | --- | --- |
| Surveyor allocation | Within 24 hours of claim reporting | 2024-09-05 | 2026-09-21 | Confirmed by primary source, Part V.4.2 |
| Communicate surveyor appointment | Immediately after allocation | 2024-09-05 | 2026-09-21 | Confirmed by primary source, Part V.4.3 |
| Survey report | Within 15 days of allocation | 2024-09-05 | 2026-09-21 | Confirmed by primary source, Part V.4.4 |
| Surveyor-delay compensation | ₹500 per day after day 15, paid to claimant | 2024-09-05 | 2026-09-21 | Confirmed by primary source, Part V.4.4 |
| Insurer decision | Within 7 days of receiving the survey report, or expiry of 15 days from allocation, whichever is earlier | 2024-09-05 | 2026-09-21 | Confirmed by primary source, Part V.4.5 |
| Delayed-settlement interest | Current bank rate + 2 percentage points, from claim intimation through payment, paid suo motu | 2024-09-05 | 2026-09-21 | Confirmed by primary source, Part V.3.2 |
| Reinstatement-value property exception | The seven-day decision rule does not apply | 2024-09-05 | 2026-09-21 | Confirmed by primary source, Part V.4.5; not relevant to motor claims |

### Seven days versus 30 days

The product will use **7 days**. Thirty days appears in the superseded 2017 policyholder-protection regime and older insurer/consumer material. The 2024 master circular expressly replaces the earlier circular framework and gives a motor/general-insurance decision clock of seven days. The separate 30-day text in Schedule A concerns when a policyholder may approach the Ombudsman if a complaint is unresolved, not the claim decision SLA.

## 2. When a registered surveyor is mandatory

| Rule | Value chosen | Source | Publication/effective date | Checked | Confidence |
| --- | --- | --- | --- | --- | --- |
| Motor-loss threshold | Registered surveyor mandatory at loss of ₹50,000 or more | [IRDAI 2024 master circular, Part V.4.1](https://irdai.gov.in/document-detail?documentId=5625747) and [Government implementation summary](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2204758&lang=2&reg=48) | 2024-09-05; PIB summary current at check | 2026-09-21 | Confirmed by primary sources |
| Statutory basis | Section 64UM(4) prevents payment/settlement of a loss at or above the amount specified by IRDAI without a licensed surveyor's report, unless IRDAI directs otherwise | [Insurance Act, 1938](https://upload.indiacode.nic.in/showfile?actid=AC_CEN_2_33_00044_193804_1523351752525&filename=a1938-04.pdf&type=actfile) | Consolidated text current through 2026-02-05 | 2026-09-21 | Confirmed by primary source |
| Below threshold | A desk assessment may be used; a surveyor is not mandatory solely because it is a motor loss | Same IRDAI and PIB sources | As above | 2026-09-21 | Confirmed by primary sources |
| Exempt claim classes | Empty list in configuration | Section 64UM permits IRDAI to direct exceptions/class exemptions, but no current published blanket class-exemption order was located | Current law checked 2026-09-21 | 2026-09-21 | **UNVERIFIED** |

The circular contains an awkward phrase, “exceeds Rs 50,000/- or more.” The Government implementation summary states that motor losses **below** ₹50,000 need not be mandatorily surveyed. The safest executable boundary is therefore `loss >= ₹50,000`.

Do not encode assumptions that all third-party, theft, fixed-benefit, or total-loss claims are exempt. Some do not involve a conventional repair-loss survey and may use an investigator or court process, but the exact treatment depends on the loss, insurer process, and policy. This remains **UNVERIFIED** until a current class-exemption order is identified.

## 3. Deductibles, NCB, and depreciation

The figures below are confirmed in current insurer wording, but the issued policy remains the source of truth. IRDAI's 2024 general-insurance product framework allows product-specific terms, so these must not be labelled as a universal statutory tariff.

Primary wording: [ICICI Lombard Private Car Package Policy](https://www.icicilombard.com/docs/default-source/default-document-library/private-car-package-policy-wording.pdf), published 2025; [Tata AIG Auto Secure base wording](https://www.tataaig.com/s3/Auto_Secure_Private_Car_Package_Base_Policy_Wording_31ed1ddc55.pdf), current at check; [HDFC ERGO NCB table](https://www.hdfcergo.com/car-insurance/no-claim-bonus), current at check.

| Item | Value | Publication/effective date | Checked | Confidence |
| --- | --- | --- | --- | --- |
| Compulsory private-car deductible | ₹1,000 up to 1500 cc; ₹2,000 above 1500 cc | ICICI wording published 2025 | 2026-09-21 | Confirmed by primary insurer wording; universal application **UNVERIFIED** |
| Compulsory two-wheeler deductible | ₹100 | Current insurer/IRDAI motor guidance | 2026 current page | 2026-09-21 | Confirmed by primary sources; verify issued policy |
| Voluntary private-car options | ₹2,500, ₹5,000, ₹7,500, ₹15,000 | ICICI wording published 2025 | 2026-09-21 | Confirmed for that product; universal application **UNVERIFIED** and configurable |
| Annual-policy NCB | 20%, 25%, 35%, 45%, 50% after 1–5+ consecutive claim-free years | Current HDFC and Tata AIG product material | Current at check | 2026-09-21 | Confirmed by primary insurer sources; multi-year/add-on terms may differ |
| NCB base | Discount applies to own-damage premium, not claim payout or third-party premium | Same sources and [IRDAI motor guidance](https://irdai.gov.in/web/policy-holder/motor-insurance) | Current at check | 2026-09-21 | Confirmed by primary sources |

Parts depreciation in current Tata AIG wording:

| Part/material | Depreciation | Publication/effective date | Checked | Confidence |
| --- | ---: | --- | --- | --- |
| Rubber, nylon, plastic, tyres, tubes, batteries | 50% | Current wording at check | 2026-09-21 | Confirmed by primary insurer wording |
| Fibre glass | 30% | Current wording at check | 2026-09-21 | Confirmed by primary insurer wording |
| Glass | 0% | Current wording at check | 2026-09-21 | Confirmed by primary insurer wording |
| Painting material | 50%; if bill is consolidated, treat 25% of painting charge as material | Current wording at check | 2026-09-21 | Confirmed by primary insurer wording |

Other parts, including wooden parts:

| Vehicle age | Depreciation | Publication/effective date | Checked | Confidence |
| --- | ---: | --- | --- | --- |
| Up to 6 months | 0% | Current Tata AIG wording | 2026-09-21 | Confirmed by primary insurer wording |
| Over 6 months to 1 year | 5% | Same | 2026-09-21 | Confirmed by primary insurer wording |
| Over 1 to 2 years | 10% | Same | 2026-09-21 | Confirmed by primary insurer wording |
| Over 2 to 3 years | 15% | Same | 2026-09-21 | Confirmed by primary insurer wording |
| Over 3 to 4 years | 25% | Same | 2026-09-21 | Confirmed by primary insurer wording |
| Over 4 to 5 years | 35% | Same | 2026-09-21 | Confirmed by primary insurer wording |
| Over 5 to 10 years | 40% | Same | 2026-09-21 | Confirmed by primary insurer wording |
| Over 10 years | 50% | Same | 2026-09-21 | Confirmed by primary insurer wording |

Zero-depreciation and NCB-protection add-ons can change these results. Later settlement screens must require actual policy terms and visibly label fallback figures “Sample value, not legal advice.”

## 4. IDV, total loss, salvage, and RC

| Rule | Value or treatment | Source | Publication/effective date | Checked | Confidence |
| --- | --- | --- | --- | --- | --- |
| IDV | Manufacturer's listed selling price adjusted by the policy's depreciation schedule at policy inception/renewal; it is the market value for TL/CTL/cash-loss during the policy period | [Tata AIG policy wording](https://www.tataaig.com/s3/Auto_Secure_Private_Car_Package_Base_Policy_Wording_31ed1ddc55.pdf), [ICICI wording](https://www.icicilombard.com/docs/default-source/default-document-library/private-car-package-policy-wording.pdf) | Current wording at check / 2025 | 2026-09-21 | Confirmed by primary insurer wording |
| IDV depreciation, up to 6m / 6–12m / 1–2y / 2–3y / 3–4y / 4–5y | 5% / 15% / 20% / 30% / 40% / 50% | Same | Current at check | 2026-09-21 | Confirmed by primary insurer wording |
| Vehicle over 5 years or obsolete model | IDV agreed between insurer and insured | Same | Current at check | 2026-09-21 | Confirmed by primary insurer wording |
| Constructive total loss | Retrieval and/or repair cost exceeds 75% of IDV | Same | Current at check | 2026-09-21 | Confirmed by primary insurer wording |
| Total-loss ceiling | Liability is generally IDV less value of wreck/salvage where retained by the policyholder, subject to wording | [HDFC two-wheeler wording](https://www.hdfcergo.com/docs/default-source/downloads/policy-wordings/motor-insurance-two-wheeler-policy-bundled.pdf) | Current at check | 2026-09-21 | Confirmed by primary insurer wording |
| Cash-loss option | Policyholder may retain the wreck and accept IDV less competitively assessed salvage; exact offer is policy/insurer specific | [ICICI motor page](https://www.icicilombard.com/motor-insurance) | Current at check | 2026-09-21 | Confirmed by primary insurer source; workflow details are product-specific |
| RC cancellation | Owner of a destroyed or permanently unusable vehicle must report it and forward the RC within 14 days or as soon as may be | [Motor Vehicles Act, 1988, section 55](https://upload.indiacode.nic.in/showfile?actid=AC_CH_60_1177_00001_00001_1558431354757&filename=a1988-59.pdf&type=actfile) | Consolidated text current through 2026 | 2026-09-21 | Confirmed by primary statutory source |

The application should show salvage as a separate settlement line and record whether the insurer or policyholder keeps the wreck. It should not automatically deduct salvage in every total-loss case.

## 5. Documents and FIR decision

IRDAI Part V.2 says a claimant should submit only documents directly related to the claim and gives examples: claim form, driving licence, permit, fitness certificate, FIR, untraced report, fire-brigade report, repair bills for non-cashless cases, and others “wherever applicable.” It also says a claim must not be rejected or closed merely for want of documents or delayed intimation. Source and effective date: [IRDAI master circular](https://irdai.gov.in/document-detail?documentId=5625747), 2024-09-05; checked 2026-09-21; **confirmed by primary source**.

The matrix is based on current [ICICI FAQs](https://www.icicilombard.com/info-center/faqs), [ICICI claim form](https://www.icicilombard.com/docs/default-source/other-documents/motor_claim_form.pdf), [HDFC claim form](https://www.hdfcergo.com/documents/crosslink/HDFC%20Motor%20Claim%20Form.pdf), and [Tata AIG motor claim guidance](https://www.tataaig.com/motor-insurance), all checked 2026-09-21. These are primary insurer sources, but each policy may ask for a different relevant subset.

| Claim type | Core documents | FIR rule | Confidence |
| --- | --- | --- | --- |
| Own damage, collision | Claim form/intimation, policy details, RC, valid driving licence, estimate, photos/inspection; final invoice and receipt for reimbursement | Required where there is third-party injury/damage, bodily injury, malicious act, a major accident, or the insurer/police directs it. Not universally mandatory for every minor scrape | Confirmed by primary insurer sources |
| Third party | Claim form/intimation, policy, RC, driving licence, FIR, third-party/MACT notice and relevant medical or repair records | Treat as required | Confirmed by primary insurer sources |
| Theft | Claim form/intimation, policy, RC, driving licence where relevant, all keys, FIR, final/untraced police report, RTO transfer/cancellation papers, financier NOC where hypothecated | Required | Confirmed by primary insurer sources |
| Fire | Claim form/intimation, policy, RC, driving licence where relevant, photos, fire-brigade report where attended, estimate/invoice | The IRDAI Schedule A expectation mentions FIR for fire, while the main rule says documents apply “wherever applicable.” Do not block every fire claim on FIR without insurer/police instruction | Source conflict; conditional handling is **UNVERIFIED** |
| Flood | Claim form/intimation, policy, RC, driving licence where relevant, photos, estimate/inspection, invoice/receipt for reimbursement | No primary source found making FIR universal; request only when facts or insurer require it | **UNVERIFIED** as a universal rule |

Cashless claims normally send approved repair costs directly to a network garage, with the policyholder paying deductibles and uncovered items. Reimbursement claims require the policyholder to pay and submit final invoices/receipts. The UI should explain this difference before document upload.

## 6. Grievance escalation

| Stage/rule | Value | Source | Publication/effective date | Checked | Confidence |
| --- | --- | --- | --- | --- | --- |
| Insurer complaint acknowledgement | Immediate | [IRDAI master circular, Part VI.2](https://irdai.gov.in/document-detail?documentId=5625747) | 2024-09-05 | 2026-09-21 | Confirmed by primary source |
| Insurer resolution | Within 14 days, with policy-term reasons if not accepted | Same | 2024-09-05 | 2026-09-21 | Confirmed by primary source |
| Bima Bharosa | May lodge/track with insurer through the IRDAI platform; escalation is available if unresolved or unsatisfactory | [Bima Bharosa process](https://bimabharosa.irdai.gov.in/Home/OurProcess) | Current at check | 2026-09-21 | Confirmed by primary source |
| Ombudsman eligibility amount | Claim amount up to ₹50 lakh | IRDAI master circular Part VI.3 | 2024-09-05 | 2026-09-21 | Confirmed by primary source |
| Ombudsman precondition | First represent to insurer/broker; rejection, unsatisfactory reply, or no reply for one month | [Insurance Ombudsman Rules 2017, rule 14](https://financialservices.gov.in/sites/default/files/Act-Policies/2026-01/The-Insurance-Ombudsman-Rules-2017--Last-amended-on-18.5.2021.pdf) | 2017, last amended 2021-05-18 | 2026-09-21 | Confirmed by primary source |
| Ombudsman filing limit | Within one year of rejection/unsatisfactory decision, or expiry of the one-month no-reply period; delay may be condoned | Same | Last amended 2021-05-18 | 2026-09-21 | Confirmed by primary source |
| Recommendation through mediation | Within one month after mutual written consent | [CIO FAQ](https://www.cioins.co.in/Faqs) | Current at check | 2026-09-21 | Confirmed by primary source |
| Award | Within three months after all requirements are received | [CIO overview](https://www.cioins.co.in/About) | Current at check | 2026-09-21 | Confirmed by primary source |
| Insurer award compliance | Within 30 days; late penalty ₹5,000/day plus applicable penal interest, unless appealed within 30 days | IRDAI master circular Part VI.4 | 2024-09-05 | 2026-09-21 | Confirmed by primary source |

There is a presentation difference between current IRDAI's 14-day insurer SLA, Bima Bharosa's public “15 days” language, and the Ombudsman Rules' one-month no-reply eligibility. They govern different things. The app should mark the insurer SLA missed at 14 days and explain that a no-reply Ombudsman filing is clearly eligible after one month, while an unsatisfactory final response can be taken to the Ombudsman sooner.

## 7. DPDP readiness for licence, RC, and chassis data

Primary sources: [DPDP Act 2023](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf), [final DPDP Rules 2025](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf), and [commencement notification](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf). Rules and commencement were gazetted 2025-11-14; checked 2026-09-21; **confirmed by primary sources**.

As of the check date, the core private-sector duties in Act sections 3–17 and Rules 3, 5–16 are scheduled to commence **18 months after Gazette publication, on 2027-05-14**. The Consent Manager provision commences **2026-11-14**. getClaim should implement the controls now as a future-ready baseline and good security practice, while describing their current legal commencement accurately.

| Requirement | Product consequence | Effective date/status | Confidence |
| --- | --- | --- | --- |
| Specific, informed consent and notice | Itemise licence image, RC, chassis/VIN, contact details, photos and location; state each purpose; avoid bundled consent; provide comparable withdrawal route | Core provisions scheduled 2027-05-14 | Confirmed by primary source |
| Purpose limitation/data minimisation | Collect only what the selected claim path needs; location is optional and permission-based | Scheduled 2027-05-14 | Confirmed by primary source |
| Reasonable safeguards | Encrypt/mask sensitive data as appropriate, enforce access control, log and review access, back up, bind processors contractually | Rule 6 scheduled 2027-05-14 | Confirmed by primary source |
| Breach notice to affected people | Clear notice without delay, including nature, likely consequences, mitigation, safety steps and contact | Rule 7 scheduled 2027-05-14 | Confirmed by primary source |
| Board notice | Initial notice without delay; detailed report within 72 hours unless extended in writing | Rule 7 scheduled 2027-05-14 | Confirmed by primary source |
| Security/processing logs | Minimum one year where Rules 6 and 8 apply, unless another law requires longer | Rules 6 and 8 scheduled 2027-05-14 | Confirmed by primary source |
| Erasure | Erase when consent is withdrawn or purpose no longer served unless law requires retention; provide deletion/rights workflow | Act section 8 scheduled 2027-05-14 | Confirmed by primary source |
| Claims-document retention period | No single universal motor-claim retention duration was established in this research; legal hold, insurer, tax, limitation and litigation duties may override erasure | Configure per deployed insurer/legal advice | **UNVERIFIED** |

The three-year inactivity erasure table in Rule 8 applies only to the large specified classes and thresholds in Schedule III, not automatically to this college prototype. It should not be copied as getClaim's generic retention rule.

## 8. Insurer journeys used as UX references

These descriptions are original summaries; no insurer copy, visual design, images, or branding will be reused.

1. **ICICI Lombard**: a policyholder can notify through digital or assisted channels, provide incident and policy information, then receive a video or physical inspection. Cashless repairs proceed through approval and garage settlement; reimbursement requires invoices and payment evidence. Status tracking reduces repeated calls. Source: [ICICI motor claims](https://www.icicilombard.com/motor-Insurance-Claims), current at check; checked 2026-09-21; confirmed by primary insurer source.
2. **HDFC ERGO**: registration is offered online, through WhatsApp, or by phone. The journey separates survey/inspection from repair and clearly distinguishes network-garage direct settlement from reimbursement. Source: [HDFC motor claims](https://www.hdfcergo.com/motor-insurance/claims), current at check; checked 2026-09-21; confirmed by primary insurer source.
3. **ACKO**: the app-led path emphasises quick reporting and verification, then garage estimate, survey/approval, repair, delivery, and direct insurer-garage billing while showing the customer's uncovered share. Pickup is conditional by location. Source: [ACKO garage journey](https://www.acko.com/garages/), current at check; checked 2026-09-21; confirmed by primary insurer source.

Useful patterns for getClaim are: one clear current owner, a visible next action, cashless/reimbursement choice early, photo prompts, estimate approval before repair, and explicit customer-share amounts. Marketing claims, network counts, pickup promises, and “instant” approvals must not be copied.

## 9. Dependency and application-security health

### Local checks

- `npm audit --json` on 2026-09-21 reported **0 known vulnerabilities** across 526 dependencies (231 production, 295 development, 53 optional, one peer).
- The manifest ranges and installed tree differ because caret ranges resolved newer packages. Notably, `multer` is declared `^2.0.2` but resolved to 2.3.0; React resolved to 19.2.8; React Router DOM resolved to 7.18.3; Mongoose resolved to 8.24.4.
- Audit output is not proof of safety. Release advisories published after registry audit metadata can create a gap.

### Release-note review

| Package | Finding | Source | Release date/current status | Checked | Confidence |
| --- | --- | --- | --- | --- | --- |
| Express 5 | 5.2.1 is the current repository version; stay on 5.x and test routing/error-handling changes before any major update | [Express releases](https://github.com/expressjs/express/releases) | 5.2.x current at check | 2026-09-21 | Confirmed by upstream source |
| Mongoose 8 | Resolved 8.24.4 is the final/current 8.x line and is prior-version support; Mongoose 9 is current. Mongoose 8 migration changes include driver 6, removed APIs and changed `create()` failure timing | [Version support](https://mongoosejs.com/docs/version-support.html), [8.x migration](https://mongoosejs.com/docs/migrating_to_8.html) | Mongoose 9 released 2025-11-21; 8.x support status current at check | 2026-09-21 | Confirmed by upstream source |
| Multer 2 | Resolved 2.3.0 fixes several 2026 multipart DoS issues, but 2.4.0 adds another security fix. Upgrade to at least 2.4.0 promptly and pin/test it | [Multer changelog](https://github.com/expressjs/multer/blob/main/CHANGELOG.md) | 2.4.0 current at check | 2026-09-21 | Confirmed by upstream source |
| React 19 | Resolved 19.2.8; 19.3.0 was released 2026-09-09. Upgrade as a separate tested change | [React 19.3 release](https://react.dev/blog/2026/09/09/react-19-3) | 2026-09-09 | 2026-09-21 | Confirmed by upstream source |
| React Router 7 | Resolved 7.18.3, with 7.18.4 available. Version 7 remains security-supported, while v8 is current. Apply the 7.x patch now; plan a separately tested v8 migration | [Changelog](https://reactrouter.com/changelog), [security policy](https://github.com/remix-run/react-router/security) | 7.x supported at check | 2026-09-21 | Confirmed by upstream source |

### Recommended security direction

| Area | Current concern | Recommended direction | Source | Checked | Confidence |
| --- | --- | --- | --- | --- | --- |
| JWT storage | Browser JWT is kept in `localStorage`, so any successful XSS can read it | Move session/refresh credentials to `HttpOnly; Secure; SameSite` cookies, add CSRF defence appropriate to deployment, keep access lifetimes short, and rotate/revoke | [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html), [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | 2026-09-21 | Confirmed by authoritative security guidance |
| Password hashing | `bcryptjs` is pure JavaScript; algorithm settings and the 72-byte bcrypt input limit need explicit control | Prefer Argon2id (minimum OWASP profile 19 MiB, 2 iterations, parallelism 1) for new hashes. If migration risk is too high, use native bcrypt with cost at least 10, enforce/handle 72-byte limit, and rehash on login | [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) | 2026-09-21 | Confirmed by authoritative security guidance |
| File uploads | Licence/RC files are high-impact personal data; MIME strings and extensions alone are forgeable | Allowlist extensions and signatures, generate server filenames, enforce per-file/request/field limits, authorise access, store outside the public web root, prevent execution, scan/quarantine in production, and apply CSRF protection | [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) | 2026-09-21 | Confirmed by authoritative security guidance |

## Open research items

1. **UNVERIFIED**: a current Gazette/IRDAI order listing claim classes exempt under Insurance Act section 64UM was not found. The application will use no class exemptions by default.
2. **UNVERIFIED**: FIR is not treated as universally mandatory for every fire or flood own-damage claim because the current circular's Schedule A expectation and “wherever applicable” main rule do not create a clear universal gate.
3. **UNVERIFIED**: deductible, voluntary-deductible, NCB, and depreciation profiles are current product-wording defaults, not universal law. Actual policy terms must override them.
4. **UNVERIFIED**: no regulator-set on-account/interim payment percentage was found. The configurable demo default is 50% and must be labelled “Sample value, not legal advice.”
5. **UNVERIFIED**: the production retention period for actual claim documents needs insurer/legal input; the one-year DPDP log minimum is not a complete claims-record schedule.

