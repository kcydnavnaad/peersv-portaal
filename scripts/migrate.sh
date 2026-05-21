#!/usr/bin/env bash
set -euo pipefail

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

if [[ -z "${DATABASE_URL:-}" ]]; then
  log "ERROR: DATABASE_URL is not set"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  log "ERROR: psql not found in PATH"
  exit 1
fi

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  log "ERROR: migrations directory $MIGRATIONS_DIR not found"
  exit 1
fi

log "ensuring __migrations table exists"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE IF NOT EXISTS __migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

shopt -s nullglob
files=("$MIGRATIONS_DIR"/*.sql)
shopt -u nullglob

if [[ ${#files[@]} -eq 0 ]]; then
  log "no migrations found in $MIGRATIONS_DIR"
  exit 0
fi

applied=0
skipped=0

for file in "${files[@]}"; do
  filename="$(basename "$file")"
  # Escape single quotes for safe SQL interpolation (defensive; drizzle
  # filenames are normally [0-9a-z_].sql).
  filename_sql="${filename//\'/\'\'}"

  exists="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -tAc \
    "SELECT 1 FROM __migrations WHERE filename = '$filename_sql'")"

  if [[ "$exists" == "1" ]]; then
    log "skipping $filename: already applied"
    skipped=$((skipped + 1))
    continue
  fi

  log "applying $filename"
  if ! psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<EOF
BEGIN;
\i $file
INSERT INTO __migrations (filename) VALUES ('$filename_sql');
COMMIT;
EOF
  then
    log "ERROR: migration $filename failed"
    exit 1
  fi

  log "applied $filename"
  applied=$((applied + 1))
done

log "done: $applied applied, $skipped skipped"
