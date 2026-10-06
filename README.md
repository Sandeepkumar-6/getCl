# getClaim

getClaim is a MERN vehicle-care and Indian motor-insurance claims platform. It provides separate policyholder, surveyor, administrator, and super-administrator workspaces.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB at `mongodb://127.0.0.1:27017`, optional in development because the server can start a local database with persistent storage in `.local/mongo` (the first run downloads MongoDB if needed)

## Local setup

```powershell
npm install
node scripts/init-env.js
npm run seed
npm run dev
```

`scripts/init-env.js` creates `server/.env` with a new random JWT secret. The file is ignored and must never be committed. Use [server/.env.example](server/.env.example) as the configuration reference.

`npm run seed` and `npm run dev` also initialize missing environment configuration automatically. The development database preserves seeded accounts and changes across restarts; tests use temporary fallback storage. Run the seed before starting the app for the first time. Re-running it resets demo records. On Windows, `start-getClaim.bat` launches both services without requiring an installed MongoDB service.

The client runs at `http://localhost:5173` and the API at `http://localhost:5000`. Development email and SMS use console adapters, so account links and event messages appear in structured server output without contacting real people. To send real email, set `EMAIL_TRANSPORT=smtp` with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `EMAIL_FROM` in `server/.env` (see `server/.env.example`); for Gmail use `smtp.gmail.com`, port 587 and an app password. SMS still needs a real provider before production use.

If the API is deployed behind a trusted reverse proxy, set `TRUST_PROXY_HOPS` to the exact number of trusted hops. Keep it `0` for direct local development.

## Demo accounts

After seeding:

| Role | Email | Password |
| --- | --- | --- |
| Policyholder | `customer@getclaim.in` | `Customer@123` |
| Policyholder (one vehicle, no claims) | `neha@getclaim.in` | `Customer@123` |
| Surveyor | `surveyor@getclaim.in` | `Surveyor@123` |
| Admin | `admin@getclaim.in` | `Admin@123` |
| Super Admin | `superadmin@getclaim.in` | `SuperAdmin@123` |

All seeded documents and records are generated demo data.

The main policyholder demonstrates multi-vehicle switching and claim-linked care. Neha's account demonstrates a useful no-claim state with one vehicle, active insurance, service history, and an upcoming service.

## Checks

```powershell
npm run lint
npm test
npm run build
```

The regulatory research and implementation register are in [docs/research.md](docs/research.md) and [docs/rules.md](docs/rules.md).

## Security notes

Read [the security and deployment gate](docs/security-deployment.md) before putting the site online or accepting real customer documents.

- Development uploads use `server/uploads` with generated names. Production startup requires `STORAGE_DRIVER=s3`; the database stores metadata and object-storage keys, never absolute filesystem paths.
- Authentication links are single-use hashes in the database. Raw verification and reset tokens are sent only through the configured email adapter.
- Five failed password attempts lock that account for 15 minutes. Public authentication routes also have IP rate limits.
- Changing or resetting a password invalidates JWTs issued before `passwordChangedAt`.
- The console email adapter refuses to run in production.
- Important claim, policy, vehicle-care, verification, and reminder events create an in-app notification and attempt delivery to the registered email address and mobile number. Delivery state is visible in the notification centre. Console delivery is demo-only.
- Vehicle alerts run at startup and every six hours. Service date/odometer thresholds, monthly checks, PUC/document expiry, and insurance renewal alerts use deduplication keys so a run cannot repeatedly create the same alert.

## Production configuration

Use a managed MongoDB deployment, a newly generated JWT secret of at least 64 characters, an HTTPS frontend origin in `CLIENT_URL`, a production email provider, and S3-compatible object storage. Set `STORAGE_DRIVER=s3`, `S3_BUCKET`, and `S3_REGION`; optional `S3_ENDPOINT` and `S3_FORCE_PATH_STYLE` support compatible providers. SMS delivery still requires a provider integration. Do not run the demo seed against production.
