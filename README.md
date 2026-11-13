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

`vercel.json` sets a Content-Security-Policy: scripts only from the site and Cloudflare's captcha, connections only to the site and the Supabase project, no plugins, and no framing. `style-src` keeps `'unsafe-inline'` because the dropdown component injects a style element when it opens. If you add a service the site talks to (analytics, a new API, another host for scripts or fonts), allow it in that header or the browser will block it; the console shows the blocked address.

## End-to-end tests

Real browser tests (Playwright) run against a throwaway copy of the backend in Docker built from the repo's own migrations, so they never touch production data. They cover requests and reviews through the captcha, moderation, admin login, and the privacy rules.

- `npm run e2e:db`: start the local backend (first run downloads Docker images) and write `.env.e2e`.
- `npm run e2e`: run all tests (starts the site and the site's dev server). Projects: `chromium` and `mobile` (Pixel 7) run the accessibility checks in light and dark themes; `safari` and `iphone` (WebKit) run the behaviour specs. WebKit needs system libraries (`sudo npx playwright install-deps webkit`), so locally you can skip it with `npm run e2e -- --project=chromium --project=mobile`; CI installs them and runs everything.
- `npm run e2e:db:stop`: stop the local backend.
- `E2E_BASE_URL=https://salhab-events.vercel.app npm run e2e:smoke`: read-only checks against the live site (no data written).

Local tests use Cloudflare's public always-pass captcha keys. CI (`.github/workflows/ci.yml`) runs the same suite. It starts three kinds of job together: **Code quality** (types, lint, unit tests with the coverage gate, build), the **browser tests** (one job per browser or kind of test, each with its own throwaway backend, so they run side by side), and **All checks passed**, which succeeds only if everything else did. That last one is the only check branch protection needs to require, so adding a browser or a test job is one line in the workflow and no settings change.

The suite also checks accessibility with axe (WCAG A and AA, serious and critical problems fail the build) on every public page and every admin tab, in a desktop and a phone-sized browser (the `mobile` project in `playwright.config.ts`). Pages have their own addresses (`#/events`, `#/reviews`, ...), so back, forward, reload and shared links work.

`e2e/responsive.spec.ts` checks the layout at 320, 360, 390, 768, 1024 and 1440 px on every page and admin tab, with long names and many months in the data: nothing scrolls sideways, every control is at least 24 px (the WCAG 2.5.8 floor), form fields are at least 40 px tall on a phone, and the request and review forms are centred on a wide screen. The site is mobile first: the shared controls are 44 px tall below 768 px and compact from there up.

Breakpoints are in rem, so a reader who raises the browser's text size gets the compact layout earlier instead of a wide one that no longer fits. `e2e/text-size.spec.ts` checks that in Firefox with a real larger default text size, `e2e/keyboard.spec.ts` checks the skip link and the day dialog (Escape, focus kept inside, focus returned), and `e2e/visual.spec.ts` compares screenshots of every page with committed baselines (see `.github/workflows/visual-baselines.yml` for changing them on purpose). The dark mode choice is remembered in the browser; without one the site follows the device setting.

## Backups

Free Supabase projects have no automatic backups, so `.github/workflows/backup.yml` exports the database (the `public` schema: bookings, requests, reviews, admins list) twice a week, encrypts it with GPG, and uploads it to a **private** Cloudflare R2 bucket (nothing is stored in this public repo). Admin logins are not in it: re-create them with the steps under "Admin accounts".

One-time setup:
1. Cloudflare, R2: create a private bucket (for example `salhab-events-backups`) and add a lifecycle rule that deletes objects after 30 days.
2. R2, Manage API tokens: create a token with Object Read and Write, limited to that bucket only.
3. Repository secrets: `SUPABASE_DB_URL` (Supabase, Connect, **Session pooler** connection string with your database password; the direct host is IPv6 only and GitHub runners cannot reach it), `BACKUP_PASSPHRASE` (keep a copy in a password manager; without it a backup cannot be opened), `R2_ENDPOINT` (`https://<account id>.r2.cloudflarestorage.com`), `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.

Run it once from the Actions tab to check it works.

**Restoring** (on a new, empty Supabase project, or after a disaster):

1. Download the newest file from the bucket and decrypt it: `gpg -d db-....sql.gpg > backup.sql` (the passphrase is `BACKUP_PASSPHRASE`).
2. `scripts/prepare-restore.sh backup.sql > restore.sql`. It leaves out two things a plain restore would choke on: the admins rows (they point at logins that a new project does not have) and `ALTER DEFAULT PRIVILEGES` lines (Supabase does not let you run them).
3. Run `restore.sql` on the database: `psql "$SUPABASE_DB_URL" -c 'drop schema public cascade' -f restore.sql` (the dump creates the schema again). Or paste it into the SQL Editor after running `drop schema public cascade;`.
4. Re-create the admin logins as under "Admin accounts" (Authentication, Add user, then the `insert into public.admins` SQL).
5. Deploy the `submit` function and set its secrets again if the project is new (see "Deploying the backend").

`.github/workflows/restore-drill.yml` rehearses exactly this once a month, from the bucket: newest file, decrypt, restore into a local Supabase stack with these steps, then check row counts, the privacy rules (visitors see no phone numbers and no requests), an admin sign-in and the site in a browser. It also fails when the newest backup is more than 5 days old. Run it from the Actions tab after changing any backup secret. To try it on your own computer: `npm run e2e:db`, then `node scripts/restore-drill.mjs backup.sql` and `npx playwright test --project=restore`. The one thing it cannot rehearse is a real new Supabase project (point 5, and the Supabase-side secrets).

## Deploying the backend

`.github/workflows/deploy-supabase.yml` keeps production Supabase in step with this repo, so the two cannot drift apart again (a grant that existed locally but not in production once broke the public forms). After a merge to `main` that changes `supabase/migrations/`, `supabase/functions/` or `supabase/config.toml` it:

1. checks that production's migration history matches the repo (refuses to continue if not),
2. applies the new migrations,
3. deploys the `submit` function with the JWT check off (the public forms call it without a login),
4. calls the live function without a captcha token and requires a 403, which proves it is deployed and reachable.

From now on, change the database by adding a migration file in a PR, never by hand in the SQL Editor.

### Secrets and settings (Settings, Secrets and variables, Actions)

| Secret | Where to get it |
|---|---|
| `SUPABASE_DB_URL` | Already set for backups: the **Session pooler** string (Connect, with your database password). All database commands use it, which works from GitHub's IPv4-only runners. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Already set for the keepalive job. Used for the final check. |
| `SUPABASE_ACCESS_TOKEN` | New. https://supabase.com/dashboard/account/tokens, Generate new token, name it `github-deploy`, scope it to this project only and give it **Edge Functions** (write) permission. If the first run reports a missing permission, add **Projects** (read). |

The function's own secrets (`TURNSTILE_SECRET`, and the optional `ALLOWED_ORIGINS` and `TURNSTILE_EXPECTED_HOSTNAMES` used by the hardened function) are set once in Supabase, Edge Functions, Secrets. The workflow never touches them.

Optional approval step: Settings, Environments, `production`, tick **Required reviewers** and add yourself. Then each deploy and baseline waits for your approval. (The `production` environment is created by the first run if it does not exist.)

### One-time baseline (before the first deploy)

Production's four migrations were applied by hand, so its migration history is empty. A deploy would try to run them again, so the workflow refuses to deploy until you record them as applied:

1. Add the `SUPABASE_ACCESS_TOKEN` secret.
2. Actions, **deploy-supabase**, Run workflow, action **plan**. It lists what a deploy would do (all four migrations, which is expected before the baseline) and ends with an error saying production is not baselined. That error is the expected result of this first run.
3. Run the workflow again with action **baseline** (it marks everything up to `20261112010000` as applied and changes no tables).
4. Run **plan** again. It should now end green with "Remote database is up to date".

After that, every merge that touches the paths above deploys itself. To deploy by hand, run the workflow with action **deploy**.

### If the weekly check reports drift

The weekly **plan** run fails when production and the repo disagree. Open the run: it names the versions.

- "the database has migrations the repo does not have": someone changed production by hand or from another branch. Add the missing migration file to the repo (copy the SQL that was run) in a PR. If it is not a real change, see the repair note below.
- "waiting migration is older than the newest applied one": a migration file was added with an old timestamp. Rename it with a new timestamp and merge.
- "could not read production": check that `SUPABASE_DB_URL` is still valid (the database password may have been reset).

Repair note: `npx supabase migration repair --status reverted <version> --remote="<url>" --yes` removes a wrongly recorded version from the history. It changes no tables.

The check compares migration history only, not table contents. It will not notice a manual change that never went through a migration file.

### Rolling back

Migrations only move forward. To undo a change, add a new migration that reverses it and merge it. To undo a function change, revert the PR: the deploy runs again with the old code. A database backup (see Backups) is the last resort.

### Checks you can run locally

`scripts/migration-status.test.sh` (needs Docker) runs the history comparison against a throwaway database and checks every outcome: not baselined, in sync, one waiting, drift, history gap, unreadable.

## Installing and offline use (PWA)

The site can be added to a phone's home screen and opens like an app (`public/manifest.json`, the icons, and `public/apple-touch-icon.png`). A small service worker (`public/sw.js`, registered only in production builds by `src/lib/registerSw.ts`) keeps the app itself (page, scripts, styles, icons), so the calendar opens without a connection and shows the "try again" message instead of data.

- It never caches data: only same-origin GET requests are handled, so bookings, login and the captcha always use the network. The browser test (`e2e/pwa.spec.ts`) checks the cache holds nothing from the database or login.
- A new deploy shows up on the next visit: the page itself is fetched from the network first.
- Icons are generated by `node scripts/make-icons.mjs` (needs Playwright's Chromium); change the logo there and re-run it.
- Run the offline checks against the live site with `E2E_BASE_URL=https://salhab-events.vercel.app npx playwright test --project=pwa`.

## Moving data from the old system

`python3 -I scripts/csv-to-sql.py <folder with Booking_export.csv and BookingRequest_export.csv>` (we keep the old system's exports in `OldProject/exports/`, gitignored) writes `data-export/import.sql` inside that folder (gitignored, contains personal data); run it in the SQL Editor. Add `--replace` to wipe and re-import (only before cutover, because afterwards it would erase real data).

## Deploy

Import the repo in Vercel (Vite preset) and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. `vercel.json` adds basic security headers.

## Known limits

- Overlapping bookings are allowed on purpose (family events).
- Holiday warnings are worked out from the browser's Umm al-Qura calendar (`src/lib/islamicDates.ts`), from last year to four years ahead; nothing to update by hand. They are approximate, since the real day depends on the moon.
- Lists load up to 1000 rows.
