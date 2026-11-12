#!/usr/bin/env bash
# Compares the migration files in the repo with the migration history of a database.
# Usage: scripts/migration-status.sh <postgres-url>   (MIGRATIONS_DIR overrides supabase/migrations)
#
# Exit codes (the deploy workflow relies on these):
#   0   in sync, nothing to apply
#   10  only new migrations are waiting (safe to deploy)
#   20  the database has no migration history but the repo has migrations (run the baseline first)
#   30  drift: the database has versions the repo lacks, or a waiting migration is older than the
#       newest applied one (history gap)
#   40  could not read the database
# It checks migration history only, not whether the schema itself matches.
set -uo pipefail

URL=${1:?usage: migration-status.sh <postgres-url>}
DIR=${MIGRATIONS_DIR:-supabase/migrations}

psql_() { docker run --rm --network host -e URL="$URL" -e PGSSLMODE postgres:17 sh -c 'psql "$URL" -Atq -c "$0"' "$1"; }

local_versions=$(find "$DIR" -maxdepth 1 -name '[0-9]*_*.sql' -printf '%f\n' 2>/dev/null | cut -d_ -f1 | sort)

has_table=$(psql_ "select to_regclass('supabase_migrations.schema_migrations') is not null") || { echo "cannot read the database"; exit 40; }
remote_versions=""
if [ "$has_table" = "t" ]; then
  remote_versions=$(psql_ "select version from supabase_migrations.schema_migrations order by version") || { echo "cannot read the migration history"; exit 40; }
fi

pending=$(comm -23 <(echo "$local_versions") <(echo "$remote_versions") | sed '/^$/d')
unknown=$(comm -13 <(echo "$local_versions") <(echo "$remote_versions") | sed '/^$/d')
newest_remote=$(echo "$remote_versions" | sed '/^$/d' | tail -1)

echo "repo migrations:     $(echo "$local_versions" | sed '/^$/d' | wc -l)"
echo "database history:    $(echo "$remote_versions" | sed '/^$/d' | wc -l)"

if [ -z "$newest_remote" ] && [ -n "$local_versions" ]; then
  echo "NOT BASELINED: the database has no migration history, but these were applied by hand:"
  echo "$pending"
  exit 20
fi
if [ -n "$unknown" ]; then
  echo "DRIFT: the database has migrations the repo does not have:"; echo "$unknown"; exit 30
fi
for p in $pending; do
  if [[ "$p" < "$newest_remote" ]]; then
    echo "DRIFT: waiting migration $p is older than the newest applied one ($newest_remote)"; exit 30
  fi
done
if [ -n "$pending" ]; then
  echo "waiting to be applied:"; echo "$pending"; exit 10
fi
echo "in sync"
