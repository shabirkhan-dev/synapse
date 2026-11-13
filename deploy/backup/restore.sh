#!/bin/sh
# Restores a `pg_dump -Fc` file into an empty database, then prints row counts to check it.
# Usage (inside the backup container):
#   restore.sh <dump file> [database]              # a new database, default synapse_restore_check
#   restore.sh --replace <dump file> <database>     # drop and recreate <database> first
# --replace is for restoring over the live database: stop api, worker and backup first
# (docs/runbooks/database-recovery.md). It never restores on top of existing objects: pg-boss keeps
# partitioned tables that `pg_restore --clean` cannot drop.
set -eu

replace=false
if [ "${1:-}" = "--replace" ]; then
	replace=true
	shift
fi
dump="${1:?usage: restore.sh [--replace] <dump file> [database]}"
target="${2:-synapse_restore_check}"

case "$target" in
*[!a-z0-9_]* | "") echo "restore: database name must be lowercase letters, digits and _" >&2 && exit 2 ;;
esac
[ -r "$dump" ] || { echo "restore: cannot read $dump" >&2 && exit 2; }

exists=$(psql -d postgres -tAc "select count(*) from pg_database where datname = '$target'")
if [ "$exists" = "1" ]; then
	tables=$(psql -d "$target" -tAc "select count(*) from pg_tables where schemaname not in ('pg_catalog', 'information_schema')")
	if [ "$tables" != "0" ] && [ "$replace" = false ]; then
		echo "restore: $target is not empty ($tables tables); pass --replace to drop and recreate it" >&2
		exit 3
	fi
	if [ "$replace" = true ]; then
		connected=$(psql -d postgres -tAc "select count(*) from pg_stat_activity where datname = '$target' and pid <> pg_backend_pid()")
		if [ "$connected" != "0" ]; then
			echo "restore: $connected connection(s) to $target; stop api, worker and backup first" >&2
			exit 4
		fi
		dropdb "$target"
		createdb "$target"
		echo "restore: dropped and recreated $target"
	fi
else
	createdb "$target"
	echo "restore: created database $target"
fi
# The dump's tables use the vector type, so the extension must exist before data is loaded.
psql -d "$target" -qc "create extension if not exists vector"
pg_restore --dbname="$target" --no-owner --exit-on-error "$dump"
echo "restore: $dump -> $target"

for table in users organizations rag_documents rag_chunks audit_events; do
	printf 'restore: %-14s %s rows\n' "$table" "$(psql -d "$target" -tAc "select count(*) from $table")"
done
