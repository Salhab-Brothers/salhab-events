#!/usr/bin/env bash
# Turns a backup (plain SQL from pg_dump) into SQL that restores cleanly on a Supabase project:
#   - the admins rows are left out: they point at logins (auth.users) that a fresh project does not
#     have, so the restore would fail. Re-create the admin logins afterwards (README, "Admin accounts").
#   - ALTER DEFAULT PRIVILEGES lines are left out: Supabase does not let the postgres role run them,
#     and they only affect tables created later, not the restored ones.
# Usage: scripts/prepare-restore.sh backup.sql > restore.sql
set -euo pipefail
awk '/^COPY public\.admins /{skip=1;next} skip&&/^\\\.$/{skip=0;next} !skip && !/^ALTER DEFAULT PRIVILEGES/' "${1:?usage: prepare-restore.sh backup.sql}"
