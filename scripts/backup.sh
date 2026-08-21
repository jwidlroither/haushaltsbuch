#!/usr/bin/env bash
# =============================================================
# Haushaltsbuch – PostgreSQL Backup Script
# Erstellt täglich ein komprimiertes Backup, behält 7 Tage.
#
# Einrichten (Cron, täglich um 2 Uhr):
#   crontab -e
#   0 2 * * * /path/to/haushaltsbuch/scripts/backup.sh >> /var/log/haushaltsbuch-backup.log 2>&1
# =============================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER="${DB_CONTAINER:-haushaltsbuch-db}"
DB_NAME="${DB_NAME:-haushaltsbuch}"
DB_USER="${DB_USER:-haushalt}"
KEEP_DAYS="${KEEP_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup → $BACKUP_FILE"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: $BACKUP_FILE ($SIZE)"

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$KEEP_DAYS" -delete
REMAINING=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" | wc -l)
echo "[$(date -Iseconds)] Retention: kept $REMAINING backup(s)"
