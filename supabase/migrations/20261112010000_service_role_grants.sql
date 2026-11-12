-- The submit function stores public forms with the service role. Grant it explicitly
-- instead of relying on the project's default privileges.
grant select, insert, update, delete on public.booking_requests, public.reviews to service_role;
