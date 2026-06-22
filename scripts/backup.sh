#!/usr/bin/env bash
# Backup do banco Supabase (PostgreSQL)
# Requer pg_dump e DATABASE_URL

set -euo pipefail

DATABASE_URL="${DATABASE_URL:-}"
if [ -z "$DATABASE_URL" ]; then
  echo "Defina DATABASE_URL" >&2
  exit 1
fi

BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"
FILENAME="abs_resolve_$(date +%Y%m%d_%H%M%S).sql.gz"

pg_dump "$DATABASE_URL" | gzip > "${BACKUP_DIR}/${FILENAME}"
echo "Backup salvo em ${BACKUP_DIR}/${FILENAME}"
