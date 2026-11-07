#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
	echo "[api] running database migrations..."
	bun dist/database/migrate.js
fi

exec "$@"
