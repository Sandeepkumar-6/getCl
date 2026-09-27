# Vehicle images

The dashboard garage, claim rows, claim detail, vehicle list and vehicle care use a shared image component. Uploaded photos take priority, then IMAGIN.studio catalogue imagery when configured, then labelled local model illustrations, then a neutral placeholder. Local illustrations are not colour- or variant-exact and never become claim evidence.

## Enable automatic catalogue images for future vehicles

1. Obtain your own IMAGIN.studio CDN customer identifier and a suitable licence. Confirm Indian make/model/year coverage and the required paint options with the provider; universal coverage is not assumed.
2. Copy `client/.env.example` to `client/.env.local` and set `VITE_IMAGIN_CUSTOMER_KEY` to the browser/CDN customer identifier. This is visible in image URLs by design: never put a private API secret here. Configure authorised domains with the provider.
3. Restart Vite (or rebuild and deploy the frontend).
4. Add vehicles with their actual make, model, manufacturing year, colour/OEM paint name and, if known, the manufacturer's paint code. Existing vehicles can use **Vehicle care → Set colour & paint code**.

The URL builder sends make, model, year, fuel type, paint description and paint code. No registration number, VIN/chassis number, owner or claim details are sent. Images load directly from the provider CDN, without server downloading or caching. Generic colour names can produce a nearest available match; OEM paint codes improve accuracy. `Catalogue image` identifies the result as stock imagery. Failed images fall back without breaking the page.

No provider credentials were available during implementation. URL construction and fallback handling are tested; live image matching and coverage need verification with the account's customer key. No borrowed demo keys are included.

## Sources

- [Vehicle selection parameters](https://docs.imagin.studio/guides/getting-images/i.-core-data-and-setup/selecting-a-car)
- [Paint ID and description](https://docs.imagin.studio/guides/getting-images/ii.-image-customization-and-styling/selecting-a-car-color)
- [Direct-CDN usage requirements](https://docs.imagin.studio/guides/getting-images)
- [Account plans](https://www.imaginstudio.com/us/plans)

Generated fallback PNG paths and exact prompts are recorded in `client/src/assets/vehicles/README.md`. These four assets were created with the built-in image generator, not a paid API integration.
