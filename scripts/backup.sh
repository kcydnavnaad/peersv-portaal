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
  log "cleaning up backups older than ${RETENTION_DAYS} days on ${SSH_HOST} via SFTP"

  cutoff_date=$(date -u -d "-${RETENTION_DAYS} days" +%Y-%m-%d 2>/dev/null || \
                date -u -v-${RETENTION_DAYS}d +%Y-%m-%d 2>/dev/null || \
                date -u +%Y-%m-%d)

  set +e
  listing=$(sftp \
    -i "$SSH_PRIVATE_KEY_PATH" \
    -o StrictHostKeyChecking=accept-new \
    -o UserKnownHostsFile=/tmp/known_hosts \
    -b - \
    "${SSH_USER}@${SSH_HOST}" 2>&1 << SFTP_EOF
cd ${REMOTE_PATH}
ls -1
SFTP_EOF
  )
  listing_rc=$?
  set -e

  if [[ $listing_rc -ne 0 ]]; then
    log "WARNING: SFTP listing failed with exit ${listing_rc}, skipping cleanup this run"
    log "sftp output: ${listing}"
  else
    to_delete=()
  while IFS= read -r line; do
    case "$line" in
      ${BACKUP_PREFIX}-[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-*.sql.gz)
        file_date=$(echo "$line" | sed -n "s/^${BACKUP_PREFIX}-\([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\)-.*/\1/p")
        if [[ -n "$file_date" && "$file_date" < "$cutoff_date" ]]; then
          to_delete+=("$line")
        fi
        ;;
    esac
  done <<< "$listing"

  deleted=0
  if [[ ${#to_delete[@]} -gt 0 ]]; then
    delete_cmds=""
    for f in "${to_delete[@]}"; do
      delete_cmds+="rm ${f}"$'\n'
    done

    set +e
    delete_output=$(sftp \
      -i "$SSH_PRIVATE_KEY_PATH" \
      -o StrictHostKeyChecking=accept-new \
      -o UserKnownHostsFile=/tmp/known_hosts \
      -b - \
      "${SSH_USER}@${SSH_HOST}" 2>&1 << SFTP_DELETE_EOF
cd ${REMOTE_PATH}
${delete_cmds}
SFTP_DELETE_EOF
    )
    delete_rc=$?
    set -e

    if [[ $delete_rc -ne 0 ]]; then
      log "WARNING: SFTP delete failed with exit ${delete_rc}"
      log "sftp output: ${delete_output}"
      deleted=0
    else
      deleted=${#to_delete[@]}
    fi
  fi

  log "cleanup done: ${deleted} file(s) removed (cutoff: ${cutoff_date})"
  fi
else
  log "RETENTION_DAYS not set, skipping cleanup"
fi

log "done: ${filename}"
