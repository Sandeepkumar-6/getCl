# Temporary college deployment

## Live deployment — 6 October 2026

- Website: https://getclaim-design-preview.vercel.app (full college demo; the earlier design-only restrictions have been removed).
- API: https://getclaim-api.onrender.com — Render Free, Singapore.
- Database: Atlas Free `getclaim-free`, dedicated `getclaim_prod` database.
- Deployed application commit: `04d066f`.
- Verified through the public website API: registration, login, secure cookies, saved vehicle retained after logout and another login, and anonymous access denied. Browser sign-in and the saved vehicle dashboard were also verified.
- Email recovery and uploads remain unavailable. Use fictional details for the college demonstration.

Use Vercel Hobby for the frontend, Render Free for the API and Atlas Free for the dedicated `getclaim_prod` database in the separate getClaim project. No paid services are required by this configuration.

Set `PUBLIC_DEMO=true` and `NODE_ENV=production` on Render. Use a fresh JWT_SECRET of at least 64 characters. Configure the Atlas connection in Render's private MONGO_URI field, including `/getclaim_prod` in the URI. The existing Atlas user getclaim_app has readWrite only on this database. Restrict network access to the API's outbound addresses.

Build the frontend with `VITE_PUBLIC_DEMO=true` on Vercel. The root vercel.json proxies /api to the Render service so cookies and CSRF protection work on the same website origin.

New accounts use demo usernames and passwords. Account records, vehicles and claims are stored in Atlas. Shared seeded accounts are view-only. The application keeps HTTPS-only, HttpOnly session cookies, CSRF checks, password hashing and role restrictions.

Use fictional details only. Email verification, email recovery, staff email MFA, surveyor applications and file uploads are unavailable in this demo. In-app notifications remain available. Production deployment without PUBLIC_DEMO still requires the full email, storage and scanning configuration.

The demo seed runs only on an empty isolated database. Re-running the seed manually resets demo data, so do not use it after collecting presentation accounts.

Render's free service sleeps when idle. Atlas persists data separately from the API filesystem. Free services have quotas and no guaranteed 90-day availability; keep a local copy for the presentation.
