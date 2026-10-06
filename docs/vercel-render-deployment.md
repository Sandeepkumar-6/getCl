# Vercel + Render deployment

Status (6 October 2026): the application source is in `Sandeepkumar-6/getCl`. Render hosts the API and Vercel hosts the frontend. Configure durable storage, managed MongoDB, and production email before the API can start. Uploaded files are not scanned for malware; do not accept real claim documents unless this risk is explicitly accepted.

## Free deployment in progress

- Atlas M0 cluster `getclaim-free` and the scoped `getclaim_app` database user exist. Render's outbound CIDR ranges still need to be added to the Atlas IP access list.
- Render service: https://dashboard.render.com/web/srv-db27h5flot8c73e5aeo0 (`free`, Node 24, private GitHub repo). Its `MONGO_URI` and `JWT_SECRET` are already set in Render. The latest deploy fails at the production storage gate by design.
- Cloudflare R2: create a private Standard storage bucket and a bucket-scoped Object Read & Write S3 API token. Set `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_REGION=auto`, `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` in Render. Keep the bucket private.
- Resend: verify a sender domain and create a sending API key. Set `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY`, and `EMAIL_FROM` in Render. Render Free blocks SMTP ports, so use the HTTPS API.
- After the API is healthy, configure the Vercel `/api` proxy for the actual Render URL, deploy the integrated frontend, and exercise registration, verification, claim upload/download, and account isolation.

## Architecture

Vercel serves client/dist and proxies /api to the public Render API HTTPS origin. This keeps the browser's requests, HttpOnly session cookie and CSRF cookie on one origin. Render runs the API. MongoDB and the S3-compatible bucket are independent production services. Do not migrate the local seeded database. Uploaded files are not malware-scanned.

## Prepared files

- Dockerfile: Node 24 API runtime, production dependencies only, unprivileged user, no .env or demo database.
- render.yaml: API in Singapore and secret values requested in Render. Auto-deploy is off for controlled rollout.
- deploy/vercel.template.json and scripts/configure-vercel.js: generate root vercel.json using the actual Render API origin; frontend build/output settings, API routing, SPA deep links, CSP/security headers, no API caching.
- server/scripts/bootstrap-admin.js: one-time creation of the owner's initial account; refuses to replace existing accounts and requires a password change and production email second factor.

## Paid Blueprint deployment order

1. Connect Vercel/Render to the source repository and review hosting charges, database, storage, email, Vercel, taxes, bandwidth, and workspace charges before provisioning.
2. Choose the final Vercel project/domain. Set Render CLIENT_URL to that exact HTTPS origin. Supply a fresh managed MONGO_URI, private S3 credentials/bucket, and verified Resend sender values through Render. For non-AWS S3 storage, set S3_ENDPOINT and S3_FORCE_PATH_STYLE as required; adjust S3_REGION if needed. Set JWT_SECRET to a securely generated value of at least 64 characters in the dashboard.
3. Deploy render.yaml after reviewing costs and entering required secrets. Verify `/api/health` reports the database connected.
4. Run `node scripts/configure-vercel.js https://ACTUAL-API-HOST.onrender.com` with the actual API origin. Commit the resulting vercel.json to the deployment source. Import the repository root into Vercel; keep the configured build command and client/dist output. Do not set a frontend API URL pointing directly to Render.
5. Verify TRUST_PROXY_HOPS against the actual Render/Vercel forwarding topology. The blueprint starts at 1; inspect trusted forwarding behavior before opening traffic. Deploy Vercel to its final origin, verify security headers and /api/health through Vercel.
6. Supply temporary BOOTSTRAP_ADMIN_NAME/EMAIL/PHONE/PASSWORD variables in Render and run `node scripts/bootstrap-admin.js` from the service's /app/server directory. Remove the temporary variables afterwards. Verify staff OTP email and password change. Customer accounts should register normally.
7. Check customer registration/verification, sign-in/refresh/logout, claim routing and documents, upload/download behavior, cross-account ownership, and private bucket access. Remember uploaded files are not malware-scanned. Review the remaining operational requirements in security-deployment.md before accepting real customer records.

Do not attach this backend to wildcard Vercel preview origins; staff email links and cookie/CSRF checks use the fixed production CLIENT_URL. Use a separate staging backend/database if preview deployments need working authentication.

## Sources checked 5 October 2026

- https://vercel.com/docs/routing/rewrites
- https://render.com/docs/blueprint-spec
- https://render.com/docs/compute-plans
- https://render.com/pricing
