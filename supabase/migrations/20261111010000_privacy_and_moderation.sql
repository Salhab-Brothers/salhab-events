-- Public visitors must not see phone numbers or notes; reviews need approval.
-- Idempotent.

-- bookings: anon gets row access but only these columns; admins keep full access.
revoke select on public.bookings from anon;
grant select (id, date, event_name, time_slot, person_name, status, book_diwan, created_date)
  on public.bookings to anon;

drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings for select to anon using (true);
-- Logged-in users get rows only through the admin policy (bookings_admin_write is "for all").

-- reviews: submitted unapproved; the public sees approved ones only.
alter table public.reviews add column if not exists approved boolean not null default false;

drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select to anon, authenticated
  using (approved or public.is_admin());

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to anon, authenticated
  with check (approved = false);
