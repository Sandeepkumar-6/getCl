# Vercel + Render deployment

Status: hosting configuration is prepared. No cloud service has been created or published yet. Use the lighthouse source, preserving vcap22. Publish this source snapshot to a private deployment repository/branch; the older remote commit does not contain this work.

## Architecture

Vercel serves client/dist and proxies /api to the public Render API HTTPS origin. This keeps the browser's requests, HttpOnly session cookie and CSRF cookie on one origin. Render runs the API and a private ClamAV service. MongoDB and the S3-compatible bucket are independent production services. Do not migrate the local seeded database.

## Prepared files

- Dockerfile: Node 24 API runtime, production dependencies only, unprivileged user, no .env or demo database.
- render.yaml: API in Singapore and private 4 GB ClamAV scanner, a signature disk, and secret values requested in Render. Auto-deploy is off for controlled rollout.
- deploy/vercel.template.json and scripts/configure-vercel.js: generate root vercel.json using the actual Render API origin; frontend build/output settings, API routing, SPA deep links, CSP/security headers, no API caching.
- server/scripts/bootstrap-admin.js: one-time creation of the owner's initial account; refuses to replace existing accounts and requires a password change and production email second factor.

## Deployment order

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
