#!/bin/bash
# Restore the PostgreSQL database used by the Investigation Tracker system.
# Usage: ./scripts/restore.sh backups/backup_investigation_tracker_20260101_120000.sql.gz
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME=$(docker compose ps -q db)

if [ -z "$CONTAINER_NAME" ]; then
  echo "Database container is not running. Start it with: docker compose up -d db"
  exit 1
fi

echo "This will overwrite the current database: ${POSTGRES_DB:-investigation_tracker}"
read -p "Continue? (y/N) " confirm
if [ "$confirm" != "y" ]; then
  echo "Cancelled."
  exit 0
fi

gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "${POSTGRES_USER:-investigation}" -d "${POSTGRES_DB:-investigation_tracker}"

echo "Restore completed from: $BACKUP_FILE"
