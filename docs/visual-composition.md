# Contextual composition pass

Scope: decorative SVG artwork, header composition and small spacing refinements in the existing portal. All routes, state, handlers, API calls, forms, authentication and data remain as implemented before this pass.

## Reference decisions

- Porsche Brand Guide, Space and Images: https://assets.porsche.com/en/Modules — use purposeful space and reduced complexity. Adapt the automotive restraint, not the brand or its assets.
- Porsche Design System grid: https://designsystem.porsche.com/v3/styles/grid/ — respect content safe zones and fluid composition.
- The existing getClaim application and the supplied brief define typography, navy/teal palette, hierarchy and section meaning.

## Explicit section assignments

| Area | Artwork | Composition |
| --- | --- | --- |
| Sidebar | Road map | Faint route drawing in unused space beneath navigation |
| Customer Home | Coverage arcs | Dark flat navy/teal overview with concentric coverage lines |
| Staff overview | Technical grid | Pale workspace header |
| Claims | Document and milestones | Pale header, thin teal edge |
| Vehicles | Vehicle blueprint | Cool blueprint ground, measurement lines |
| Policies | Coverage shield | Navy header, light text, teal outline |
| Documents | Paper stack | Near-white archive treatment and ruled group spacing |
| Reminders | Clock and calendar | Quiet green-tinted header and focused list edge |
| Help | Connection network | Cool pale header with connecting nodes |

The reusable ContextualBackground component does not choose variants automatically. Each page chooses its own. Artwork is hidden from assistive technology and cannot intercept input. Small screens omit header art and sidebar art; the Home artwork becomes smaller and fainter. No animation is added by this pass. Information and real vehicle imagery remain the primary visual content.

## Review gate

Sidebar refinement: user-supplied reference image 3, left Road Pattern panel, is the dominant visual source. Adopt its flowing lane lines, deep navy and teal active navigation. Keep the existing width, controls and account behavior; omit the reference's extra profile/settings controls. Replace the small map with a full-height SVG road, fading behind navigation. The geometric and illustrated-car panels are alternatives, not combined motifs. User image 1 identifies the dashboard Documents/Recent activity pair: give files a quiet icon ground and make timeline text navy with teal markers, retaining all existing content and links.

The user subsequently requested all three sidebar alternatives, cycling on refresh. The explicit order is road, geometric, then gradient/vehicle/shield coverage. Choose once at document load and store the next index in sessionStorage per tab. Client navigation, state updates and StrictMode renders do not cycle it. If storage is unavailable, display road. The coverage treatment reuses a decorative vehicle asset from the existing local catalogue and cannot be confused with the selected vehicle's data. Mobile drawers omit the artwork to keep navigation clear.

Verified in the browser: four consecutive loads show road, geometric, coverage, road. Navigation to Claims and back preserves the current design on all four loads. Mobile menu opening/closing and overflow checks pass, with no browser runtime errors. All three desktop variants and the mobile drawer were visually inspected. Lint and production build pass.

Review all seven customer sections at 1440, 1024, 768 and 390 pixels. Check horizontal overflow, console errors, text/action overlap and existing controls. Run frontend lint/build and the existing browser workflow smoke test. Preserve vcap22 unchanged.
