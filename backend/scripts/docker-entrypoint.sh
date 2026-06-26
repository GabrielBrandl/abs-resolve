#!/bin/sh
set -e

echo "==> Prisma migrate deploy..."
npx prisma migrate deploy

if [ "$RUN_SEED" = "true" ]; then
  echo "==> Seed (RUN_SEED=true)..."
  npx tsx prisma/seed.ts || true
fi

echo "==> ABS Resolve API starting on port ${PORT:-3001}..."
exec node dist/index.js
