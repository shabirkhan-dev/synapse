#!/bin/sh
# Copies the dumps in /backups to S3-compatible storage (AWS S3, Cloudflare R2, Backblaze B2, MinIO…)
# and deletes copies there older than BACKUP_OFFSITE_KEEP_DAYS. Runs in the `offsite` service of
# deploy/compose.yml (rclone image); the bucket settings arrive as RCLONE_CONFIG_OFFSITE_* variables.
# With BACKUP_ENCRYPTION_PASSPHRASE set, files are encrypted before they leave the host (rclone crypt):
# keep the passphrase somewhere other than this host, or the copies cannot be read.
#
#   offsite.sh            copy every BACKUP_OFFSITE_INTERVAL_SECONDS, forever
#   offsite.sh --once     copy and prune once
#   offsite.sh --list     list the copies
#   offsite.sh --fetch <synapse-….dump>   download one copy into /backups (for restore.sh)
set -eu

bucket="${BACKUP_S3_BUCKET:?Set BACKUP_S3_BUCKET}"
remote="offsite:$bucket/${BACKUP_S3_PREFIX:-synapse}"
if [ -n "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]; then
	export RCLONE_CONFIG_SEALED_TYPE=crypt
	export RCLONE_CONFIG_SEALED_REMOTE="$remote"
	RCLONE_CONFIG_SEALED_PASSWORD="$(rclone obscure "$BACKUP_ENCRYPTION_PASSPHRASE")"
	export RCLONE_CONFIG_SEALED_PASSWORD
	remote="sealed:"
fi

interval="${BACKUP_OFFSITE_INTERVAL_SECONDS:-3600}"
keep_days="${BACKUP_OFFSITE_KEEP_DAYS:-90}"

copy_once() {
	# Only finished dumps: backup.sh writes `*.partial` and renames when done.
	rclone copy /backups "$remote" --include 'synapse-*.dump' -v
	if [ "$keep_days" -gt 0 ]; then
		rclone delete "$remote" --include 'synapse-*.dump' --min-age "${keep_days}d" -v
	fi
	echo "offsite: copied to ${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX:-synapse} at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
}

case "${1:-}" in
--once) copy_once ;;
--list) rclone lsl "$remote" --include 'synapse-*.dump' ;;
--fetch)
	name="${2:?usage: offsite.sh --fetch <synapse-YYYYMMDDTHHMMSSZ.dump>}"
	case "$name" in
	synapse-*.dump) ;;
	*) echo "offsite: expected a synapse-*.dump name" >&2 && exit 2 ;;
	esac
	case "$remote" in
	*:) source="$remote$name" ;;
	*) source="$remote/$name" ;;
	esac
	rclone copyto "$source" "/backups/$name" -v
	echo "offsite: fetched /backups/$name"
	;;
"")
	while true; do
		copy_once || echo "offsite: FAILED at $(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
		sleep "$interval"
	done
	;;
*) echo "usage: offsite.sh [--once | --list | --fetch <file>]" >&2 && exit 64 ;;
esac
