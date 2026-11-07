#!/usr/bin/env bash
# Sync the root .env with Doppler (project and config from doppler.yaml / `doppler setup`).
#   env-sync.sh pull   Doppler -> .env   (the old file is kept as .env.backup)
#   env-sync.sh push   .env -> Doppler   (adds and updates keys; never deletes any)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

die() {
    printf '[env] %s\n' "$1" >&2
    exit 1
}

command -v doppler >/dev/null 2>&1 ||
    die "Doppler CLI not found. Install it: https://docs.doppler.com/docs/install-cli"

case "${1:-}" in
pull)
    tmp="$(mktemp)"
    trap 'rm -f "$tmp"' EXIT
    # Download first, so a failed pull never leaves a half-written .env.
    doppler secrets download --no-file --format env >"$tmp"
    [[ -f .env ]] && cp .env .env.backup
    mv "$tmp" .env
    chmod 600 .env
    printf '[env] .env written from Doppler (%s keys)\n' "$(grep -c '=' .env)"
    ;;
push)
    [[ -f .env ]] || die "No .env to push (copy .env.example to .env first)"
    doppler secrets upload .env --silent
    printf '[env] .env uploaded to Doppler\n'
    ;;
*)
    die "usage: env-sync.sh pull|push"
    ;;
esac
