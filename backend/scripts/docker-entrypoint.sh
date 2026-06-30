#!/bin/sh
set -e

# EasyPanel: carrega arquivo montado (Mounts → File → /app/.env.production)
for env_file in /app/.env.production /app/.env; do
  if [ -f "$env_file" ]; then
    echo "==> Carregando variáveis de $env_file"
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
    break
  fi
done

# Chave Asaas: no EasyPanel Ambiente use $$aact... ; normaliza para $aact...
if [ -n "$ASAAS_API_KEY" ]; then
  case "$ASAAS_API_KEY" in
    '$$'*) ASAAS_API_KEY="${ASAAS_API_KEY#"$"}"; export ASAAS_API_KEY ;;
  esac
fi

# $(PRIMARY_DOMAIN) só expande no serviço web — no backend use DOMAIN ou URL fixa
if [ -n "$DOMAIN" ]; then
  case "$FRONTEND_URL" in
    *'$(PRIMARY_DOMAIN)'*) export FRONTEND_URL="https://${DOMAIN}" ;;
  esac
  case "$API_PUBLIC_URL" in
    *'$(PRIMARY_DOMAIN)'*) export API_PUBLIC_URL="https://${DOMAIN}" ;;
  esac
fi

if [ -z "$DATABASE_URL" ] && [ -z "$DIRECT_URL" ]; then
  echo ""
  echo "❌ ERRO: DATABASE_URL não está definida no container."
  echo ""
  echo "No EasyPanel → serviço BACKEND → Ambiente:"
  echo "  1. Cole todo o conteúdo de deploy/easypanel.env.local"
  echo "  2. ASAAS_API_KEY com \$\$ no início (ex.: \$\$aact_prod_...)"
  echo "  3. FRONTEND_URL=https://app.absresolve.com.br (domínio real)"
  echo "  4. Salvar → Deploy"
  echo ""
  echo "Alternativa: Mounts → File → mountPath /app/.env.production"
  echo ""
  exit 1
fi

export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"

echo "==> Env OK (DATABASE_URL definida, ASAAS_MOCK=${ASAAS_MOCK:-false})"
echo "==> Prisma migrate deploy..."
npx prisma migrate deploy

if [ "$RUN_SEED" = "true" ]; then
  echo "==> Seed (RUN_SEED=true)..."
  npx tsx prisma/seed.ts || true
fi

echo "==> ABS Resolve API starting on port ${PORT:-3001}..."
exec node dist/index.js
