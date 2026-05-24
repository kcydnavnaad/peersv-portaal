#!/usr/bin/env bash
set -euo pipefail

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
err() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; }

if [[ $# -lt 1 ]]; then
  err "usage: $(basename "$0") <version>  (e.g. 1.1.0)"
  exit 1
fi

VERSION="$1"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  err "Versie moet semver zijn (1.2.3 of 1.2.3-rc1), geen 'v' prefix"
  exit 1
fi

TAG="v$VERSION"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  err "not inside a git repo"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  err "working tree is dirty. Commit or stash first:"
  git status --short >&2
  exit 1
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$current_branch" != "main" ]]; then
  err "current branch is '$current_branch', expected 'main'"
  exit 1
fi

log "fetching origin..."
git fetch origin --tags

local_sha="$(git rev-parse main)"
remote_sha="$(git rev-parse origin/main)"
if [[ "$local_sha" != "$remote_sha" ]]; then
  err "local main ($local_sha) is not in sync with origin/main ($remote_sha)"
  err "pull or push first"
  exit 1
fi

if git rev-parse --verify "refs/tags/$TAG" >/dev/null 2>&1; then
  err "tag $TAG already exists locally"
  exit 1
fi

if git ls-remote --tags --exit-code origin "refs/tags/$TAG" >/dev/null 2>&1; then
  err "tag $TAG already exists on origin"
  exit 1
fi

cat <<SUMMARY

Release summary
  Tag:    $TAG
  Commit: $local_sha
  Branch: $current_branch

This will:
  1. git tag -a $TAG -m "Release $TAG"
  2. git push origin $TAG

SUMMARY

read -r -p "Proceed? [y/N] " reply
case "$reply" in
  y|Y|yes|YES) ;;
  *) err "aborted"; exit 1 ;;
esac

log "creating annotated tag $TAG"
git tag -a "$TAG" -m "Release $TAG"

log "pushing $TAG to origin"
git push origin "$TAG"

GREEN=$'\033[1;32m'
RESET=$'\033[0m'

cat <<NEXT

${GREEN}Tag $TAG pushed.${RESET} Next steps:

  1. Wait for GitHub Actions to build and push images:
       gh run watch

  # Git tag = v$VERSION (semver conventie), Docker image tag = $VERSION (geen v, matches GHCR output)
  2. Bump the prod image tag in k3s-homelab:
       sed -i.bak "s|peersv-portaal\\(-migrate\\|-backup\\)\\?:.*|peersv-portaal\\1:$VERSION|g" \\
         ~/VDK/k3s-homelab/apps/peersv-prod/deployment.yaml

  3. Commit and push k3s-homelab:
       cd ~/VDK/k3s-homelab \\
         && git add apps/peersv-prod/deployment.yaml \\
         && git commit -m "Bump peersv-prod to $TAG" \\
         && git push

  4. Wait for ArgoCD to sync, or force refresh:
       argocd app sync peersv-prod

NEXT
