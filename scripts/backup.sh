#!/bin/bash
# Backup PostgreSQL — agendar via cron: 0 2 * * * /path/to/backup.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="abs_resolve_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

docker exec abs_resolve_db pg_dump -U abs abs_resolve | gzip > "${BACKUP_DIR}/${FILENAME}"

# Manter apenas últimos 7 backups
ls -t "${BACKUP_DIR}"/abs_resolve_*.sql.gz | tail -n +8 | xargs -r rm

echo "Backup criado: ${BACKUP_DIR}/${FILENAME}"
