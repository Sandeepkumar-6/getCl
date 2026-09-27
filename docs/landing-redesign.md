# Landing page redesign — 23 September 2026

The supplied text brief was the layout reference; no separate reference screenshot was attached with that brief.

## Implementation

- `client/src/pages/HomeLanding.jsx` is the real React landing page, loaded at the existing `/` route.
- `LandingProductPreview.jsx` composes the existing `VehicleIdentity`, `ClaimSummary`, `Badge`, `Logo`, and `ClaimTable` components using controlled sample records. It does not authenticate, fetch customer records, or call mutation APIs.
- Laptop and phone shells are CSS. Their screens are HTML, fitted with ResizeObserver. The scaled previews are inert and hidden from the accessibility tree; their figure supplies a meaningful description. Real landing navigation and CTAs are fully keyboard accessible.
- The existing claim entry, login, registration and public information routes are preserved. “Watch How It Works” opens the existing process guide; it does not imply an implemented video player.
- The six-step workflow uses semantic HTML and Lucide icons. Statistics are explicitly illustrative; demo settlement behavior is described accurately.
- Navy #0B1F4B and blue #1468F3 are scoped to the landing treatment. Existing logo artwork and teal brand accents remain.

## Local assets

All new runtime asset paths are centralized in `client/src/assets/manifest.js`.

- `client/public/assets/hero/hero-road-india.webp`: 216,692 bytes.
- `client/public/assets/brand/`: dark/light logo SVG containers, mark SVG and optimized PNG. The SVG containers embed the existing approved raster emblem; they are not hand-traced vector replacements.
- `client/public/assets/claims/getclaim-icon.svg`: same approved mark.
- `client/public/assets/vehicles/`: optimized existing Creta, Nexon, Baleno and Amaze illustrations, approximately 21–24 KB each. Existing model identities are retained; an Amaze is not relabelled as a City. No unused generic vehicle is invented.
- Original source PNGs are retained. `scripts/prepare-landing-assets.js` reproduces the optimization with an installed sharp package and an optional source road-image path.

## Image generation

The **built-in image_gen tool** generated only the road photograph. Final prompt:

> Use case: photorealistic-natural. Asset type: wide automotive SaaS website hero BACKGROUND photograph only. Create a premium photoreal daylight photograph of a clean modern Indian metropolitan boulevard with a distant Mumbai-like modern skyline, elegant glass buildings, pale blue sky and subtle atmospheric haze. Wide 3:2 composition. Road occupies lower half, skyline upper middle. A single modern deep blue compact SUV is seen at a moderate distance on the FAR RIGHT edge, small in the frame (about 15 percent image width), side/rear three-quarter view, naturally driving along the road. This car is supporting environmental context and must NOT be a close-up or foreground subject. Leave broad uncluttered light space across the left two-thirds and lower center for later HTML laptop/phone overlays. Bright premium editorial automotive photography, white and pale blue atmosphere, soft natural shadows, credible road perspective. No laptop, no phone, no screens, no typography, no logos, no watermark, no UI. Crisp realistic architecture and road, restrained saturation.

## Verification

- Production build and ESLint pass.
- Browser checked at 320, 390, 768, 1024, 1280 and 1440 pixels; no document overflow or broken images.
- Laptop claim table fits its screen; mobile preview includes vehicle, claim status, next update and quick actions.
- Browser error/warning log was empty during review.
- Responsive navigation opens and closes; Features opens `/services`, Get Started opens `/register`, and File a Claim preserves the unauthenticated redirect to `/login`.
- Backend, database, authentication logic, and claim operations were not modified.
