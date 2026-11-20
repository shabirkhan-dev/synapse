#!/usr/bin/env bash
# CI side of a deploy (.github/workflows/cd.yml): reach the host over SSH, log it in to the registry
# for this deploy, run deploy/remote-deploy.sh there, then check readiness over HTTPS.
# Skips (successfully, with a note) until the environment is configured.
set -euo pipefail

summary() { echo "$1" >>"${GITHUB_STEP_SUMMARY:-/dev/stderr}"; }

missing=()
for name in DEPLOY_HOST SSH_KEY KNOWN_HOSTS API_HOST REF PREFIX TAG; do
	if [ -z "${!name:-}" ]; then missing+=("$name"); fi
done
if [ "${#missing[@]}" -gt 0 ]; then
	summary "Deploy skipped: not configured (${missing[*]} empty). See docs/runbooks/deployment.md."
	exit 0
fi

user=${DEPLOY_USER:-deploy}
path=${DEPLOY_PATH:-/srv/synapse}

dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT
printf '%s\n' "$SSH_KEY" >"$dir/key"
printf '%s\n' "$KNOWN_HOSTS" >"$dir/known_hosts"
chmod 600 "$dir/key"
remote() {
	ssh -i "$dir/key" -o UserKnownHostsFile="$dir/known_hosts" -o StrictHostKeyChecking=yes \
		-o BatchMode=yes "$user@$DEPLOY_HOST" "$@"
}

# The job's token can pull this repository's images until the job ends; log out afterwards.
if [ -n "${REGISTRY_TOKEN:-}" ]; then
	printf '%s' "$REGISTRY_TOKEN" | remote docker login ghcr.io -u "${REGISTRY_USER:-github-actions}" --password-stdin
fi
status=0
remote "cd $(printf '%q' "$path") && deploy/remote-deploy.sh $(printf '%q ' "$REF" "$TAG" "$PREFIX")" || status=$?
remote docker logout ghcr.io >/dev/null || true
if [ "$status" -ne 0 ]; then
	summary "Deploy of \`$TAG\` to \`$DEPLOY_HOST\` failed (exit $status)."
	exit "$status"
fi

curl --fail --silent --show-error --retry 20 --retry-delay 6 --retry-all-errors \
	"https://$API_HOST/api/v1/health/ready"
echo
summary "Deployed \`$TAG\` to \`$DEPLOY_HOST\`; https://$API_HOST/api/v1/health/ready is ready."
