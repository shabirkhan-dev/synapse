#!/usr/bin/env bash
# Runs on the production host (docs/runbooks/deployment.md): check out a release, pull its images
# from the registry and restart the stack without building. Also the rollback: pass an older tag.
#
#   deploy/remote-deploy.sh <git-ref> <image-tag> <image-prefix>
#   deploy/remote-deploy.sh v1.2.3 1.2.3 ghcr.io/acme/synapse
#
# The registry login (if the images are private) happens before this runs.
set -euo pipefail

if [ "$#" -ne 3 ]; then
	echo "usage: $0 <git-ref> <image-tag> <image-prefix>" >&2
	exit 64
fi
ref=$1
tag=$2
prefix=$3

cd "$(dirname "$0")/.."
if [ ! -f deploy/.env ]; then
	echo "deploy/.env is missing on this host (deploy/.env.example)" >&2
	exit 1
fi

git fetch --quiet --tags origin
git checkout --quiet --detach "$ref"

compose() {
	IMAGE_PREFIX=$prefix IMAGE_TAG=$tag docker compose -f deploy/compose.yml --env-file deploy/.env "$@"
}

compose pull --quiet api worker console
# --no-build: the images come from CI; --wait: return only once health checks pass.
compose up -d --no-build --remove-orphans --wait --wait-timeout 300
compose ps
