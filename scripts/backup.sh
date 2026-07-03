#!/bin/bash
# Backup the PostgreSQL database used by the Investigation Tracker system.
# Usage: ./scripts/backup.sh
set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME=$(docker compose ps -q db)

if [ -z "$CONTAINER_NAME" ]; then
  echo "Database container is not running. Start it with: docker compose up -d db"
  exit 1
fi

FILE="$BACKUP_DIR/backup_${POSTGRES_DB:-investigation_tracker}_${TIMESTAMP}.sql.gz"

docker exec -t "$CONTAINER_NAME" pg_dump -U "${POSTGRES_USER:-investigation}" "${POSTGRES_DB:-investigation_tracker}" | gzip > "$FILE"

echo "Backup completed: $FILE"
