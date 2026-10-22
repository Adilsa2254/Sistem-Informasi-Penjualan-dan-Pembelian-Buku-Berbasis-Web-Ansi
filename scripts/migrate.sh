#!/usr/bin/env bash
set -euo pipefail

if [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi

URL="${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}"
[ -n "$URL" ] || { echo "Set DATABASE_URL_UNPOOLED (atau DATABASE_URL) dulu."; exit 1; }

psql "$URL" -v ON_ERROR_STOP=1 -q -c "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());"

for f in db/migrations/*.sql; do
  name="$(basename "$f")"
  applied="$(psql "$URL" -tA -c "SELECT 1 FROM schema_migrations WHERE filename = '$name'")"
  if [ -z "$applied" ]; then
    echo "Menjalankan $name"
    psql "$URL" -v ON_ERROR_STOP=1 -q --single-transaction -f "$f" -c "INSERT INTO schema_migrations (filename) VALUES ('$name')"
  else
    echo "Lewati $name (sudah dijalankan)"
  fi
done

echo "Migrasi selesai."
