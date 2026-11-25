#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

if [ "${RUN_SEED_ON_BOOT:-true}" = "true" ]; then
  echo "Ensuring initial admin account and settings exist..."
  npx tsx prisma/seed.ts
fi

echo "Starting application server..."
exec node server.js
