# getClaim UI/UX audit

Audited: 23 September 2026

## Product and architecture

- The existing MERN architecture, Vite client, Express API, MongoDB models, authentication, role permissions, integrations, and claim workflow remain intact.
- The client uses a shared visual system in `client/src/index.css` and reusable primitives in `client/src/components/UI.jsx`.
- Live API data remains the source for vehicles, policies, claims, documents, assignments, settlements, notifications, users, and staff records.
- Roles verified: policyholder, surveyor, administrator, and super administrator.

## Shared experience

| Area | Current experience | Audit result |
| --- | --- | --- |
| Public navigation | Responsive header, mobile menu, clear login entry | Verified |
| Portal navigation | Role-specific sidebar and mobile drawer | Verified |
| Visual system | Shared type, spacing, colour, radius, shadow, form, card, badge, table, modal, and state styles | Verified |
| Feedback | Toasts, field errors, empty states, retry states, and loading treatments | Verified |
| Accessibility | Semantic headings, labels, focus-visible styles, landmarks, ARIA for dialogs/progress, reduced-motion support | Verified; continue testing with assistive technology before production |
| Responsive behaviour | Desktop, tablet breakpoints, mobile navigation, collapsed grids, compact claim tables | Verified at 1440px and 390px |

## Public and authentication pages

| Route | Purpose | Audit result |
| --- | --- | --- |
| `/` | Product story and primary claim entry | Strong hierarchy and automotive imagery; verified |
| `/how-it-works` | Claim journey explanation | Verified |
| `/services` | Product capabilities | Verified |
| `/claim-eligibility` | Claim eligibility guidance | Verified |
| `/required-documents` | Evidence checklist | Verified |
| `/faq` | Expandable common questions | Verified |
| `/about` | Product context | Verified |
| `/contact` | Support and emergency details | Verified |
| `/login` | Role-aware authentication and demo access | Verified |
| `/register` | Policyholder registration | Verified |
| `/forgot-password` | Recovery request | Verified |
| `/reset-password` | Password reset | Route and validation present; token delivery remains provider-dependent |
| `/verify-email` | Verification request/confirmation | Route and validation present; provider delivery remains environment-dependent |
| `/surveyor-apply` | Surveyor application | Verified |

## Policyholder workspace

| Route | Experience | Data source | Audit result |
| --- | --- | --- | --- |
| `/portal` | Vehicle-first overview, policy state, service timing, active claim, actions, metrics, activity, notifications | `/claims/stats`, `/claims`, `/notifications`, `/vehicles` | Fixed vehicle response handling; loading, error, and empty states added; verified |
| `/portal/vehicles` | Vehicles, policies, coverage, downloads, edit/add controls | `/vehicles`, `/policies` | Verified |
| `/portal/vehicles/:id` | Odometer, service history, monthly checks, documents, reminders, claim and combined timeline | `/vehicles/:id/care` and vehicle-care APIs | Verified |
| `/portal/claims` | Searchable, filterable, sortable claim history | `/claims` | Verified |
| `/portal/claims/new` | Six-stage guided claim flow with local persistence, server draft saving, readiness scoring, evidence, and review | vehicle, policy, claim, garage, evidence APIs | Step count and responsive behaviour corrected; verified |
| `/portal/claims/:id` | Status, action owner, due date, evidence, inspection, decisions, payout, appeal, and timeline | `/claims/:id` and workflow APIs | Verified |
| `/portal/documents` | Claim resources | claims APIs | Verified |
| `/portal/activity` | Notification/activity history | `/notifications` | Verified |
| `/portal/support` | First-30-minutes guidance and claim calculator | `/calculator` | Verified |
| `/portal/profile` | Account details | authentication/account APIs | Verified |

## Operational workspaces

| Role and route | Decision supported | Audit result |
| --- | --- | --- |
| Admin `/portal` | Urgent queues, assignment gaps, verification work, near-term decisions, volume and approved payable | Verified |
| Surveyor `/portal` | Assignments, due inspections, completed work, pending reports | Verified |
| Super admin `/portal` | Global claim, policyholder, vehicle, staff, and governance overview | Verified |
| `/portal/claims` | Operational search, filtering, ownership and next action | Verified |
| `/portal/inspections` | Inspection workload | Verified |
| `/portal/staff-approvals` | Surveyor review workflow | Verified |
| `/portal/users` | User status management | Verified for authorised roles |
| `/portal/staff` | Staff creation, status, audit, and reset workflow | Verified for super admin |
| `/portal/audit` | Operational audit history | Verified |

## Changes made during this audit

- Normalised the policyholder dashboard’s vehicle response handling so the vehicle-first experience renders from the existing API.
- Added explicit loading, error, retry, and no-vehicle states to the dashboard vehicle overview.
- Corrected the claim flow copy from five to six steps.
- Made claim progress semantic with `aria-current="step"`.
- Updated the stepper to six columns and made it horizontally scrollable at tablet sizes.
- Collapsed claim forms, selection cards, summaries, timelines, and detail grids for mobile.
- Added a sticky mobile form action bar and scrollable claim-detail tabs.
- Converted the decorative portal search affordance into a keyboard-accessible link to claim search.
- Enabled the theft and third-party evidence types required by the claim submission rules, and aligned the local readiness checklist with those rules.
- Corrected the claims queue priority chip to display Critical, High, or Normal rather than a claim status.
- Rebuilt the claims filter toolbar with aligned controls, a clear search label, readable status names, and responsive desktop, tablet, and mobile layouts.

## Verification

- `npm run lint`: passed.
- `npm test`: 40 tests passed, including theft and third-party submission with all required documents.
- `npm run build`: passed.
- `npm run test:browser`: passed for all public routes and all four roles, including claim tabs, protected refresh, desktop screenshots, 390px mobile screenshots, and horizontal-overflow assertions.
- Browser console: no runtime errors in the browser smoke suite.
- Live browser workflow: policyholder claim creation, photo and document uploads, submission and tracking; admin review and assignment; surveyor inspection scheduling and report; admin decision and settlement calculation all passed. A clearly labelled workflow check claim remains in the local demo database (`GC-2026-3A34DB8F`).
- Claims filters were visually checked at desktop, 768px tablet, and 390px mobile widths after the alignment fix.

## Backend or production dependencies

- Real email and SMS delivery require production providers; development uses console adapters.
- Production document storage requires the configured S3-compatible provider.
- Final accessibility certification should include manual screen-reader and keyboard testing on production-supported browsers.
- Performance would benefit from serving responsive variants of the 1.85 MB hero image; this is an asset-delivery optimisation, not a workflow blocker.
