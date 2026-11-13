#!/bin/sh
# Writes a `pg_dump -Fc` of the database every BACKUP_INTERVAL_SECONDS into /backups and deletes
# dumps older than BACKUP_KEEP_DAYS. Connection settings come from PG* variables (deploy/compose.yml).
set -eu

interval="${BACKUP_INTERVAL_SECONDS:-86400}"
keep_days="${BACKUP_KEEP_DAYS:-14}"

backup_once() {
	file="/backups/synapse-$(date -u +%Y%m%dT%H%M%SZ).dump"
	# Write to a temporary name first, so a half-written dump never looks like a backup.
	if pg_dump --format=custom --file="$file.partial"; then
		mv "$file.partial" "$file"
		echo "backup: wrote $file ($(du -h "$file" | cut -f1))"
	else
		rm -f "$file.partial"
		echo "backup: FAILED at $(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
		return 1
	fi
	find /backups -name 'synapse-*.dump' -mtime +"$keep_days" -print -delete |
		sed 's/^/backup: deleted /'
}

if [ "${1:-}" = "--once" ]; then
	backup_once
	exit $?
fi

while true; do
	backup_once || true
	sleep "$interval"
done
