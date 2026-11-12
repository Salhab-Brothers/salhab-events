#!/usr/bin/env bash
# Restores a plain-SQL dump into a throwaway Postgres container and checks that every
# data table comes back with the same number of rows the dump holds.
# Usage: scripts/verify-backup.sh backup.sql
set -euo pipefail

DUMP=${1:?usage: verify-backup.sh backup.sql}
NAME="verify-restore-$$"
TABLES="bookings booking_requests reviews admins"
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=pw postgres:17 >/dev/null
until docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
sleep 2   # the image restarts once after its first init
until docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
psql_() { docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

# Stand-ins for objects Supabase manages and the dump refers to (roles, auth users).
ADMIN_IDS=$(awk '/^COPY public\.admins /{f=1;next} /^\\\.$/{f=0} f{print $1}' "$DUMP")
{
  echo "drop schema public cascade;"   # the dump recreates it
  echo "create role anon; create role authenticated; create role service_role; create role supabase_admin;"
  echo "create schema auth; create table auth.users (id uuid primary key);"
  echo "create function auth.uid() returns uuid language sql as 'select null::uuid';"
  for id in $ADMIN_IDS; do echo "insert into auth.users values ('$id');"; done
} | psql_

psql_ < "$DUMP"

status=0
for t in $TABLES; do
  expected=$(awk -v t="public.$t" '$0 ~ "^COPY " t " "{f=1;next} /^\\\.$/{f=0} f{n++} END{print n+0}' "$DUMP")
  actual=$(psql_ -t -A -c "select count(*) from public.$t")
  if [ "$expected" = "$actual" ]; then echo "ok   $t: $actual rows"; else echo "FAIL $t: dump has $expected, restore has $actual"; status=1; fi
done
exit $status
