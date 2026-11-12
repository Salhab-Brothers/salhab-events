# Salhab Events

Public booking calendar and admin dashboard for the Al Salhab diwan and hall. Vite, React, Tailwind, Supabase.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and publishable key (Project Settings, API Keys). Never put a `secret` or `service_role` key in this repo.
3. Run every file in `supabase/migrations/` in order in the Supabase SQL Editor (skip any the GitHub integration already applied; they are safe to run twice).
4. In Supabase, Authentication, Sign In / Providers: turn off "Allow new users to sign up".
5. `npm run dev`

## Privacy model

- Visitors can read bookings but only these columns: date, event name, slot, person name, status, diwan flag. Phone numbers and notes are admin-only (column-level grants).
- Visitors can submit booking requests and reviews. Booking requests are admin-only to read. Reviews appear only after an admin approves them (Admin, Reviews tab).
- Forms include a hidden honeypot field against basic bots. There is no captcha or rate limit yet.

## Admin accounts

Admins sign in with their phone number and password. Create each one in Supabase (Authentication, Users, Add user):

- Email: the phone in international digits plus `@admin.example.com`, e.g. `972501234567@admin.example.com`
- Password: choose one, tick "Auto Confirm User"

Then run in the SQL Editor to grant admin rights:

```sql
insert into public.admins (user_id)
select id from auth.users where email = '972501234567@admin.example.com'
on conflict do nothing;
```

Access is enforced by row-level security in the database, not by the UI. Password resets are done by a super admin in the Supabase dashboard (there is no real inbox behind the placeholder email).

## Keeping the free Supabase project awake

Free projects pause after about a week of inactivity. `.github/workflows/keepalive.yml` pings the API twice a week. Add two repository secrets (Settings, Secrets and variables, Actions): `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. GitHub disables scheduled workflows after 60 days without repo activity, so re-enable it from the Actions tab if that happens. Free projects have no automatic backups: export the tables (Table Editor, Export to CSV) from time to time.

## Captcha on the public forms (optional)

Booking requests and reviews are protected by a hidden field and review moderation. For stronger protection, turn on Cloudflare Turnstile (free):

1. Cloudflare dashboard, Turnstile, add a widget for your site domain. Copy the site key and the secret key.
2. Deploy the checking function: `supabase functions deploy submit --no-verify-jwt`, then `supabase secrets set TURNSTILE_SECRET=<secret key>`.
3. Set `VITE_TURNSTILE_SITE_KEY=<site key>` in Vercel (all environments) and redeploy. Forms now send through the function. Test a request and a review on the site.
4. Only then run `supabase/migrations/20261112000000_captcha_only_inserts.sql` in the SQL Editor. It stops the browser from inserting directly, so bots cannot skip the captcha.

With no site key set, forms insert directly as before (do not run the step 4 migration in that case).

### Hardening the function

The `submit` function checks more than the captcha: it only answers browsers on the site's own addresses, refuses a token that was solved on a different site, validates every field (phone numbers need 7 to 15 digits), and writes with the project's secret key.

- **Allowed origins:** `https://salhab-events.vercel.app`, `http://localhost:5173` and `http://localhost:5174` are built in. Add more (a custom domain, for example) with the secret `ALLOWED_ORIGINS`, comma separated. Requests with no `Origin` header (scripts, tests) are let through, because the captcha is what protects the function, not CORS; browsers always send `Origin` on a cross-site POST.
- **Production setting to add:** `supabase secrets set TURNSTILE_EXPECTED_HOSTNAMES=salhab-events.vercel.app` (comma separated if the site has several addresses, for example a custom domain). When it is not set the hostname is not checked, which the local tests rely on, because Cloudflare's test keys report a fake hostname.
- **Database key:** the function uses the `default` entry of `SUPABASE_SECRET_KEYS` when Supabase provides it and falls back to the older `SUPABASE_SERVICE_ROLE_KEY`.
- **Redeploy to apply:** none of this changes until the function is deployed again. The function is now several files (`index.ts`, `handler.ts`, `validate.ts`), so deploy it with the Supabase CLI or the automated deploy rather than pasting a single file into the dashboard editor.
- The logic lives in `handler.ts` and `validate.ts` and is unit tested with the rest of the project; `index.ts` only connects it to Deno.

### Content Security Policy

`vercel.json` sets a Content-Security-Policy: scripts only from the site and Cloudflare's captcha, connections only to the site and the Supabase project, no plugins, and no framing. `style-src` keeps `'unsafe-inline'` because the dropdown component injects a style element when it opens. If you add a service the site talks to (analytics, a new API, another font host), allow it in that header or the browser will block it; the console shows the blocked address.

## End-to-end tests

Real browser tests (Playwright) run against a throwaway copy of the backend in Docker built from the repo's own migrations, so they never touch production data. They cover requests and reviews through the captcha, moderation, admin login, and the privacy rules.

- `npm run e2e:db`: start the local backend (first run downloads Docker images) and write `.env.e2e`.
- `npm run e2e`: run all tests (starts the site and the `submit` function itself).
- `npm run e2e:db:stop`: stop the local backend.
- `E2E_BASE_URL=https://salhab-events.vercel.app npm run e2e:smoke`: read-only checks against the live site (no data written).

Local tests use Cloudflare's public always-pass captcha keys. CI runs the same suite as the `e2e` job.

## Backups

Free Supabase projects have no automatic backups, so `.github/workflows/backup.yml` exports the database (the `public` schema: bookings, requests, reviews, admins list) twice a week, encrypts it with GPG, and uploads it to a **private** Cloudflare R2 bucket (nothing is stored in this public repo). Admin logins are not in it: re-create them with the steps under "Admin accounts".

One-time setup:
1. Cloudflare, R2: create a private bucket (for example `salhab-events-backups`) and add a lifecycle rule that deletes objects after 30 days.
2. R2, Manage API tokens: create a token with Object Read and Write, limited to that bucket only.
3. Repository secrets: `SUPABASE_DB_URL` (Supabase, Connect, **Session pooler** connection string with your database password; the direct host is IPv6 only and GitHub runners cannot reach it), `BACKUP_PASSPHRASE` (keep a copy in a password manager; without it a backup cannot be opened), `R2_ENDPOINT` (`https://<account id>.r2.cloudflarestorage.com`), `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.

Run it once from the Actions tab to check it works. To restore: download the file from the bucket, `gpg -d db-....sql.gpg > backup.sql`, and run the SQL on an empty project (SQL Editor, or `psql`). Try a restore on a scratch project once, so you know it works before you need it.

## Moving data from the old system

`python3 -I scripts/csv-to-sql.py <folder with Booking_export.csv and BookingRequest_export.csv>` writes `data-export/import.sql` (gitignored, contains personal data); run it in the SQL Editor. Add `--replace` to wipe and re-import (only before cutover, because afterwards it would erase real data).

## Deploy

Import the repo in Vercel (Vite preset) and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. `vercel.json` adds basic security headers.

## Known limits

- Overlapping bookings are allowed on purpose (family events).
- Holiday warnings are hardcoded for 2026 to 2027 (`src/lib/islamicDates.js`) and need updating after that.
- Lists load up to 1000 rows.
