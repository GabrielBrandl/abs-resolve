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
  echo "No EasyPanel → projeto Compose → Environment (painel esquerdo):"
  echo "  1. Cole deploy/easypanel.env.local (sem linhas #)"
  echo "  2. Ative Create .env file"
  echo "  3. Salvar → Deploy"
  echo ""
  echo "Alternativa: Mounts → File → mountPath /app/.env.production"
  echo ""
  exit 1
fi

export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"

echo "==> Env OK (DATABASE_URL definida, ASAAS_MOCK=${ASAAS_MOCK:-false})"
echo "==> Prisma migrate deploy..."
npx prisma migrate deploy

# Plano financeiro (categorias/contas/centros) — idempotente, seguro em todo start
echo "==> Garantindo plano financeiro padrão..."
node --input-type=module -e "import('./dist/services/financeiro.service.js').then((m)=>m.garantirPlanoFinanceiroPadrao()).then(()=>{console.log('Plano financeiro OK');process.exit(0)}).catch((e)=>{console.warn('Plano financeiro:', e?.message||e);process.exit(0)})" || true

# Importa receitas de pagamentos RECEIVED antigos (idempotente)
echo "==> Backfill receitas de pagamentos..."
node --input-type=module -e "import('./dist/services/financeiro.service.js').then((m)=>m.financeiroService.backfillReceitasDePagamentos(1000)).then((r)=>{console.log('Backfill receitas:', JSON.stringify(r));process.exit(0)}).catch((e)=>{console.warn('Backfill receitas:', e?.message||e);process.exit(0)})" || true

if [ "$RUN_SEED" = "true" ]; then
  echo "==> Seed (RUN_SEED=true)..."
  npx tsx prisma/seed.ts || true
fi

echo "==> ABS Resolve API starting on port ${PORT:-3001}..."
exec node dist/index.js
