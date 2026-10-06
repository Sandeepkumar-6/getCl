# Security and deployment gate

This project handles vehicle identifiers, insurance details, licences, and claim evidence. Do not use the local demo server or seeded accounts for real customer data. No code change can make a deployment absolutely secure; production safety depends on infrastructure, operations, and independent testing.

## Implemented application controls

- Browser sessions use an eight-hour, `HttpOnly`, `SameSite=Strict` cookie. Production cookies also use `Secure` and the `__Host-` prefix. Login tokens are not returned to production or development browser JavaScript. Legacy browser tokens and local claim drafts are removed on load.
- State-changing authenticated requests require a CSRF token tied to the signed session. Logout revokes the session in MongoDB; revoked records expire automatically.
- Staff and surveyor accounts require an emailed eight-digit second factor in production. Codes expire after five minutes, allow at most five attempts, and are single-use. Staff login cannot issue a session until the code succeeds.
- Existing password hashing, login lockout, role checks, record ownership checks, schema validation, and restricted document downloads remain in place.
- Uploads are not scanned for malware. Type, signature, and 8 MB size checks remain. Production requires private S3-compatible storage; do not treat these checks as malware protection.
- Production startup refuses local/demo configuration and refuses a database containing known seeded demo accounts. The demo seed command is disabled in production.
- The production dependency audit was clear on 6 October 2026 after updating `proxy-addr` to 2.0.8. Re-run the audit before each deployment.

## Required production configuration

Set `NODE_ENV=production`, a new random `JWT_SECRET` of at least 64 characters, an HTTPS `CLIENT_URL`, managed `MONGO_URI`, `STORAGE_DRIVER=s3`, `S3_BUCKET`, S3 credentials, and authenticated email (`EMAIL_TRANSPORT=smtp` or `EMAIL_TRANSPORT=resend` with its settings). The API fails to start if these application requirements are missing. Set `TRUST_PROXY_HOPS` to the exact number of trusted proxies.

Build with `npm ci`, `npm run lint`, `npm test`, `npm run build`, and `npm audit --omit=dev`. Serve the built frontend from a hardened HTTPS host and route `/api` to the Express server. Do not expose the Vite development server, MongoDB, or the S3 bucket to the public internet.

At the HTTPS host, enable HSTS, a Content Security Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `Permissions-Policy`. A suitable CSP starting point is `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://cdn.imagin.studio; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. Test it against the built site, then tighten inline styles or self-host fonts if possible. Keep API and frontend on the same origin for the session and CSRF design.

## Still required before real customer data

1. Configure and verify encrypted database and object-storage backups, restore drills, least-privilege service accounts, secret rotation, logging retention, and alerting.
2. Choose and integrate a real SMS provider if SMS updates are promised. Development SMS is console-only; production delivery is not implemented.
3. Review privacy notices, retention and deletion rules, incident response, and applicable insurance/data-protection obligations with qualified owners.
4. Run a staging security review, authenticated penetration test, and browser tests against the actual HTTPS deployment. Confirm CSP, HSTS, private storage, and access between different customer accounts. Uploaded files will not be malware-scanned.
5. Review development-tool advisories separately. At this check, `npm audit` reports seven high-severity findings in development dependencies; `npm audit --omit=dev` reports zero production findings. Do not deploy dev dependencies or the development server.

The application has not been deployed or independently certified by this work.
