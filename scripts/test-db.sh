#!/usr/bin/env bash
# Führt die Datenbank-/RLS-/Integrationstests aus.
# CI: DORF_TEST_DATABASE_URL zeigt auf einen Postgres-Service (Superuser nötig).
# Lokal: startet einen temporären Postgres-Cluster (benötigt installiertes Postgres 15+).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "${DORF_TEST_DATABASE_URL:-}" ]; then
  exec npm run test -w @dorf/db-tests
fi

PGBIN="$(ls -d /usr/lib/postgresql/*/bin /opt/homebrew/opt/postgresql@*/bin /usr/local/opt/postgresql@*/bin 2>/dev/null | sort -V | tail -1 || true)"
if [ -z "$PGBIN" ]; then PGBIN="$(dirname "$(command -v initdb)")"; fi
DIR="$(mktemp -d)"
PORT="${DORF_TEST_PG_PORT:-54329}"
RUN=()
if [ "$(id -u)" = "0" ]; then
  chown postgres "$DIR"
  RUN=(su postgres -c)
fi
run() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$*"; else bash -c "$*"; fi; }
cleanup() { run "'$PGBIN/pg_ctl' -D '$DIR/data' -m immediate stop >/dev/null 2>&1 || true"; rm -rf "$DIR"; }
trap cleanup EXIT
run "'$PGBIN/initdb' -D '$DIR/data' -A trust -U postgres >/dev/null"
run "'$PGBIN/pg_ctl' -D '$DIR/data' -o '-p $PORT -k $DIR -c listen_addresses=127.0.0.1 -c fsync=off' -l '$DIR/log' -w start >/dev/null"
export DORF_TEST_DATABASE_URL="postgres://postgres@127.0.0.1:$PORT/postgres"
npm run test -w @dorf/db-tests
