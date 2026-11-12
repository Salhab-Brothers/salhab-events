#!/usr/bin/env bash
# Runs migration-status.sh against a throwaway Postgres container and checks every exit code.
# Usage: scripts/migration-status.test.sh   (needs Docker; uses port 55999)
set -uo pipefail
cd "$(dirname "$0")/.."

NAME=migration-status-test
PORT=55999
URL="postgresql://postgres:pw@127.0.0.1:$PORT/postgres"
TMP=$(mktemp -d)
trap 'docker rm -f "$NAME" >/dev/null 2>&1; rm -rf "$TMP"' EXIT

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=pw -p "$PORT:5432" postgres:17 >/dev/null
until docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
sleep 2
until docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
sql() { docker exec "$NAME" psql -U postgres -q -c "$1"; }

fails=0
expect() { # expect <name> <exit code>
  MIGRATIONS_DIR="$TMP" scripts/migration-status.sh "$URL" >/dev/null 2>&1; got=$?
  if [ "$got" = "$2" ]; then echo "ok   $1 (exit $got)"; else echo "FAIL $1: expected $2, got $got"; fails=1; fi
}
touch "$TMP/20260101000000_a.sql" "$TMP/20260102000000_b.sql"

expect "no history table, repo has migrations" 20
sql "create schema supabase_migrations; create table supabase_migrations.schema_migrations (version text primary key);"
expect "empty history table, repo has migrations" 20
sql "insert into supabase_migrations.schema_migrations values ('20260101000000'),('20260102000000');"
expect "in sync" 0
touch "$TMP/20260103000000_c.sql"
expect "one new migration waiting" 10
sql "insert into supabase_migrations.schema_migrations values ('20260199999999');"
expect "database has a version the repo lacks" 30
sql "delete from supabase_migrations.schema_migrations where version = '20260199999999';"
touch "$TMP/20251201000000_old.sql"
expect "waiting migration older than the newest applied" 30
rm "$TMP/20251201000000_old.sql"
URL="postgresql://postgres:wrong@127.0.0.1:$PORT/postgres" expect "unreadable database" 40
exit $fails
