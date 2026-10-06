# Vercel + Render deployment

Status (6 October 2026): the cleaned source is in the private `Sandeepkumar-6/getClaim-deploy` repository. The free Render API service `getclaim-api` exists in Singapore and builds successfully, but its startup intentionally fails until durable storage, production email, and malware scanning are configured. The existing Vercel URL is a design preview, not the integrated application. Do not accept real claim documents until the end-to-end checks below pass.

## Free deployment in progress

- Atlas M0 cluster `getclaim-free` and the scoped `getclaim_app` database user exist. Render's outbound CIDR ranges still need to be added to the Atlas IP access list.
- Render service: https://dashboard.render.com/web/srv-db27h5flot8c73e5aeo0 (`free`, Node 24, private GitHub repo). Its `MONGO_URI` and `JWT_SECRET` are already set in Render. The latest deploy fails at the production storage gate by design.
- Cloudflare R2: create a private Standard storage bucket and a bucket-scoped Object Read & Write S3 API token. Set `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_REGION=auto`, `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` in Render. Keep the bucket private.
- Resend: verify a sender domain and create a sending API key. Set `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY`, and `EMAIL_FROM` in Render. Render Free blocks SMTP ports, so use the HTTPS API.
- Malware scanning: a ClamAV daemon needs at least 3 GiB RAM, which does not fit Render Free's 512 MB. Provision a separate scanner with protected transport and credentials before enabling uploads. Do not expose the raw ClamAV TCP port publicly.
- After the API is healthy, configure the Vercel `/api` proxy for the actual Render URL, deploy the integrated frontend, and exercise registration, verification, claim upload/download, scanner failure, and account isolation.

## Architecture

Vercel serves client/dist and proxies /api to the public Render API HTTPS origin. This keeps the browser's requests, HttpOnly session cookie and CSRF cookie on one origin. On the free path, Render runs only the API; scanning needs separate hosting. The root paid Blueprint runs a private ClamAV service on Render. MongoDB and the S3-compatible bucket are independent production services. Do not migrate the local seeded database.

## Prepared files

- Dockerfile: Node 24 API runtime, production dependencies only, unprivileged user, no .env or demo database.
- render.yaml: API in Singapore and private 4 GB ClamAV scanner, a signature disk, and secret values requested in Render. Auto-deploy is off for controlled rollout.
- deploy/vercel.template.json and scripts/configure-vercel.js: generate root vercel.json using the actual Render API origin; frontend build/output settings, API routing, SPA deep links, CSP/security headers, no API caching.
- server/scripts/bootstrap-admin.js: one-time creation of the owner's initial account; refuses to replace existing accounts and requires a password change and production email second factor.

## Paid Blueprint deployment order

1. Connect Vercel/Render, choose a private source repository, and approve hosting charges. The prepared compute tiers currently total $92/month plus a 4 GB signature disk ($1/month), before database, storage, email, Vercel, taxes, bandwidth or workspace charges. This is a starting topology, not a bill guarantee. If a suitable private scanner already exists, omit the scanner resource and use its host.
2. Choose the final Vercel project/domain. Set Render CLIENT_URL to that exact HTTPS origin. Supply a fresh managed MONGO_URI, private S3 credentials/bucket and SMTP values through Render. For non-AWS S3 storage, also set S3_ENDPOINT and S3_FORCE_PATH_STYLE as required; adjust S3_REGION. Set JWT_SECRET to a securely generated value of at least 64 characters in the dashboard; Render's default 256-bit generated value is too short for this application's existing startup gate.
3. Deploy render.yaml after cost approval. Verify the private scanner is ready and /api/health reports database connected. Do not expose ClamAV on a public port. Pin the evaluated scanner image digest for the production rollout.
4. Run `node scripts/configure-vercel.js https://ACTUAL-API-HOST.onrender.com` with the actual API origin. Commit the resulting vercel.json to the deployment source. Import the repository root into Vercel; keep the configured build command and client/dist output. Do not set a frontend API URL pointing directly to Render.
5. Verify TRUST_PROXY_HOPS against the actual Render/Vercel forwarding topology. The blueprint starts at 1; inspect trusted forwarding behavior before opening traffic. Deploy Vercel to its final origin, verify security headers and /api/health through Vercel.
6. Supply temporary BOOTSTRAP_ADMIN_NAME/EMAIL/PHONE/PASSWORD variables in Render and run `node scripts/bootstrap-admin.js` from the service's /app/server directory. Remove the temporary variables afterwards. Verify staff OTP email and password change. Customer accounts should register normally.
7. Check customer registration/verification, sign-in/refresh/logout, claim routing and documents, clean upload/download and scanner rejection/outage behavior. Test cross-account ownership and private bucket access. Review the remaining operational requirements in security-deployment.md before accepting real customer records.

Do not attach this backend to wildcard Vercel preview origins; staff email links and cookie/CSRF checks use the fixed production CLIENT_URL. Use a separate staging backend/database if preview deployments need working authentication.

## Sources checked 5 October 2026

- https://vercel.com/docs/routing/rewrites
- https://render.com/docs/blueprint-spec
- https://render.com/docs/compute-plans
- https://render.com/pricing
- https://docs.clamav.net/manual/Installing/Docker.html
