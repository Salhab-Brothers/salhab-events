-- Initial schema. Idempotent so it is safe if applied twice.

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
-- No policies on purpose: clients can never read or write this table directly.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  event_name text not null check (char_length(event_name) <= 200),
  time_slot text not null check (time_slot in ('lunch','afternoon','evening','wedding','full')),
  person_name text not null check (char_length(person_name) <= 200),
  phone text not null default '' check (char_length(phone) <= 30),
  notes text not null default '' check (char_length(notes) <= 1000),
  status text not null default 'confirmed' check (status in ('confirmed','pending','cancelled')),
  book_diwan boolean not null default false,
  created_date timestamptz not null default now()
);

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) <= 100),
  second_name text not null default '' check (char_length(second_name) <= 100),
  third_name text not null default '' check (char_length(third_name) <= 100),
  last_name text not null check (char_length(last_name) <= 100),
  phone text not null check (char_length(phone) <= 30),
  date date not null,
  time_slot text not null check (time_slot in ('lunch','afternoon','evening','wedding','full')),
  event_name text not null check (char_length(event_name) <= 200),
  book_diwan boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  created_date timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_name text not null check (char_length(reviewer_name) <= 100),
  event_name text not null default '' check (char_length(event_name) <= 200),
  rating numeric not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  event_date date,
  created_date timestamptz not null default now()
);

alter table public.bookings enable row level security;
alter table public.booking_requests enable row level security;
alter table public.reviews enable row level security;

-- Table privileges (RLS below then narrows them).
grant select on public.bookings, public.reviews to anon, authenticated;
grant insert on public.booking_requests, public.reviews to anon, authenticated;
grant insert, update, delete on public.bookings, public.reviews to authenticated;
grant select, update, delete on public.booking_requests to authenticated;

-- bookings: public calendar reads; only admins write.
drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings for select to anon, authenticated using (true);
drop policy if exists bookings_admin_write on public.bookings;
create policy bookings_admin_write on public.bookings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- booking_requests: anyone can submit a pending request; only admins read or change.
drop policy if exists requests_insert on public.booking_requests;
create policy requests_insert on public.booking_requests for insert to anon, authenticated
  with check (status = 'pending');
drop policy if exists requests_admin_all on public.booking_requests;
create policy requests_admin_all on public.booking_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- reviews: public read and submit; only admins moderate.
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select to anon, authenticated using (true);
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to anon, authenticated with check (true);
drop policy if exists reviews_admin_write on public.reviews;
create policy reviews_admin_write on public.reviews for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists reviews_admin_delete on public.reviews;
create policy reviews_admin_delete on public.reviews for delete to authenticated
  using (public.is_admin());
