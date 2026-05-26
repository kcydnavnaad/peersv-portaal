#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

required_vars=(
  DATABASE_URL
  SSH_HOST
  SSH_USER
  SSH_PRIVATE_KEY_PATH
  REMOTE_PATH
  BACKUP_PREFIX
)

missing=()
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    missing+=("$var")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  log "ERROR: missing required env vars: ${missing[*]}"
  exit 1
fi

for cmd in pg_dump gzip scp; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "ERROR: $cmd not found in PATH"
    exit 1
  fi
done

if [[ ! -r "$SSH_PRIVATE_KEY_PATH" ]]; then
  log "ERROR: SSH private key not readable at $SSH_PRIVATE_KEY_PATH"
  exit 1
fi

timestamp="$(date -u +%Y-%m-%d-%H%M%S)"
filename="${BACKUP_PREFIX}-${timestamp}.sql.gz"
local_path="/tmp/${filename}"

cleanup() {
  if [[ -f "$local_path" ]]; then
    rm -f "$local_path"
  fi
}
trap cleanup EXIT

log "starting backup"
pg_dump "$DATABASE_URL" --no-owner --no-acl | gzip > "$local_path"

log "backup size: $(du -h "$local_path" | cut -f1) ($local_path)"

log "uploading to ${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}${filename}"
scp \
  -i "$SSH_PRIVATE_KEY_PATH" \
  -o StrictHostKeyChecking=accept-new \
  -o UserKnownHostsFile=/tmp/known_hosts \
  "$local_path" \
  "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}"

log "upload complete"

if [[ -n "${RETENTION_DAYS:-}" ]]; then
  log "cleaning up backups older than ${RETENTION_DAYS} days on ${SSH_HOST}"
  deleted=$(ssh \
    -i "$SSH_PRIVATE_KEY_PATH" \
    -o StrictHostKeyChecking=accept-new \
    -o UserKnownHostsFile=/tmp/known_hosts \
    "${SSH_USER}@${SSH_HOST}" \
    "find ${REMOTE_PATH} -maxdepth 1 -name '${BACKUP_PREFIX}-*.sql.gz' -type f -mtime +${RETENTION_DAYS} -print -delete" \
    | wc -l)
  log "cleanup done: ${deleted} file(s) removed"
else
  log "RETENTION_DAYS not set, skipping cleanup"
fi

log "done: ${filename}"
