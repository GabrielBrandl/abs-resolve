#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ] && [ -z "$DIRECT_URL" ]; then
  echo ""
  echo "❌ ERRO: DATABASE_URL não está definida no container."
  echo ""
  echo "No EasyPanel:"
  echo "  1. Abra o serviço BACKEND (não só o projeto)"
  echo "  2. Aba Ambiente → cole deploy/easypanel.env.local"
  echo "  3. Salvar → Deploy"
  echo ""
  exit 1
fi

export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"

echo "==> Prisma migrate deploy..."
npx prisma migrate deploy

if [ "$RUN_SEED" = "true" ]; then
  echo "==> Seed (RUN_SEED=true)..."
  npx tsx prisma/seed.ts || true
fi

echo "==> ABS Resolve API starting on port ${PORT:-3001}..."
exec node dist/index.js
