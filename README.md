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

## Moving data from the old system

`python3 -I scripts/csv-to-sql.py <folder with Booking_export.csv and BookingRequest_export.csv>` writes `data-export/import.sql` (gitignored, contains personal data); run it in the SQL Editor. Add `--replace` to wipe and re-import (only before cutover, because afterwards it would erase real data).

## Deploy

Import the repo in Vercel (Vite preset) and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. `vercel.json` adds basic security headers.

## Known limits

- Overlapping bookings are allowed on purpose (family events).
- Holiday warnings are hardcoded for 2026 to 2027 (`src/lib/islamicDates.js`) and need updating after that.
- Lists load up to 1000 rows.
