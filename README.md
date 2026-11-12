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

## End-to-end tests

Real browser tests (Playwright) run against a throwaway copy of the backend in Docker built from the repo's own migrations, so they never touch production data. They cover requests and reviews through the captcha, moderation, admin login, and the privacy rules.

- `npm run e2e:db`: start the local backend (first run downloads Docker images) and write `.env.e2e`.
- `npm run e2e`: run all tests (starts the site and the `submit` function itself).
- `npm run e2e:db:stop`: stop the local backend.
- `E2E_BASE_URL=https://salhab-events.vercel.app npm run e2e:smoke`: read-only checks against the live site (no data written).

Local tests use Cloudflare's public always-pass captcha keys. CI runs the same suite as the `e2e` job.

The suite also checks accessibility with axe (WCAG A and AA, serious and critical problems fail the build) on every public page and every admin tab, in a desktop and a phone-sized browser (the `mobile` project in `playwright.config.ts`). Pages have their own addresses (`#/events`, `#/reviews`, ...), so back, forward, reload and shared links work.

## Backups

Free Supabase projects have no automatic backups, so `.github/workflows/backup.yml` exports the database (the `public` schema: bookings, requests, reviews, admins list) twice a week, encrypts it with GPG, and uploads it to a **private** Cloudflare R2 bucket (nothing is stored in this public repo). Admin logins are not in it: re-create them with the steps under "Admin accounts".

One-time setup:
1. Cloudflare, R2: create a private bucket (for example `salhab-events-backups`) and add a lifecycle rule that deletes objects after 30 days.
2. R2, Manage API tokens: create a token with Object Read and Write, limited to that bucket only.
3. Repository secrets: `SUPABASE_DB_URL` (Supabase, Connect, **Session pooler** connection string with your database password; the direct host is IPv6 only and GitHub runners cannot reach it), `BACKUP_PASSPHRASE` (keep a copy in a password manager; without it a backup cannot be opened), `R2_ENDPOINT` (`https://<account id>.r2.cloudflarestorage.com`), `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.

Run it once from the Actions tab to check it works. To restore: download the file from the bucket, `gpg -d db-....sql.gpg > backup.sql`, and run the SQL on an empty project (SQL Editor, or `psql`). Try a restore on a scratch project once, so you know it works before you need it.

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

## Moving data from the old system

`python3 -I scripts/csv-to-sql.py <folder with Booking_export.csv and BookingRequest_export.csv>` writes `data-export/import.sql` (gitignored, contains personal data); run it in the SQL Editor. Add `--replace` to wipe and re-import (only before cutover, because afterwards it would erase real data).

## Deploy

Import the repo in Vercel (Vite preset) and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. `vercel.json` adds basic security headers.

## Known limits

- Overlapping bookings are allowed on purpose (family events).
- Holiday warnings are hardcoded for 2026 to 2027 (`src/lib/islamicDates.js`) and need updating after that.
- Lists load up to 1000 rows.
