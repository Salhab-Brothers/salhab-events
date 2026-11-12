-- Run this ONLY after the `submit` function is deployed and VITE_TURNSTILE_SITE_KEY is set
-- on the site. From then on, public forms can only be stored through that function
-- (which checks the captcha); direct inserts from the browser are refused.
revoke insert on public.booking_requests, public.reviews from anon, authenticated;
