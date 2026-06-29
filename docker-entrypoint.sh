#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  npx prisma migrate deploy
else
  echo "[entrypoint] RUN_MIGRATIONS=false, skipping migrations"
fi

echo "[entrypoint] Starting app: $*"
exec "$@"
