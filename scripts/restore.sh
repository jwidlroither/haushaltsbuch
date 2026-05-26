#!/usr/bin/env bash
# =============================================================
# Haushaltsbuch – PostgreSQL Restore Script
#
# Verwendung: ./scripts/restore.sh backups/haushaltsbuch_20260101_020000.sql.gz
# =============================================================
set -euo pipefail

BACKUP_FILE="${1:-}"
CONTAINER="${DB_CONTAINER:-haushaltsbuch-db}"
DB_NAME="${DB_NAME:-haushaltsbuch}"
DB_USER="${DB_USER:-haushalt}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Verwendung: $0 <backup-file.sql.gz>"
  echo ""
  echo "Verfügbare Backups:"
  ls -lh ./backups/*.sql.gz 2>/dev/null || echo "  Keine Backups gefunden in ./backups/"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Fehler: Datei nicht gefunden: $BACKUP_FILE"
  exit 1
fi

echo "⚠️  WARNUNG: Dies überschreibt die aktuelle Datenbank '$DB_NAME'!"
read -r -p "Fortfahren? [ja/N] " confirm
if [[ "$confirm" != "ja" ]]; then
  echo "Abgebrochen."
  exit 0
fi

echo "[$(date -Iseconds)] Restoring from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" "$DB_NAME"
echo "[$(date -Iseconds)] Restore complete ✓"
