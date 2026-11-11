# Salhab Events

Public booking calendar and admin dashboard for the Al Salhab diwan and hall. Vite, React, Tailwind, Supabase.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and publishable key (Project Settings, API Keys). Never put a `secret` or `service_role` key in this repo.
3. Run `supabase/migrations/*.sql` in the Supabase SQL Editor (skip if the GitHub integration already applied them).
4. In Supabase, Authentication, Sign In / Providers: turn off "Allow new users to sign up".
5. `npm run dev`

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

Access is enforced by row-level security in the database, not by the UI.

## Deploy

Import the repo in Vercel (Vite preset) and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
