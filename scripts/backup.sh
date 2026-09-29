#!/usr/bin/env bash
# Back up the database and object storage of the Docker deployment together,
# so restored rows point at files that exist. Run from the repository root,
# e.g. daily from cron:
#   15 2 * * * cd /srv/construction-cms && ./scripts/backup.sh >> backups/backup.log 2>&1
#
# Keeps the last $KEEP_DAYS days in ./backups (copy them off the server too).
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="backups/${STAMP}"
mkdir -p "${DEST}"

# shellcheck disable=SC1091
set -a; . ./.env.production; set +a
BUCKET="${S3_BUCKET:-cms}"

echo "[$(date -u +%FT%TZ)] database → ${DEST}/database.dump"
${COMPOSE} exec -T postgres pg_dump --format=custom --no-owner \
  -U "${POSTGRES_USER:-cms}" -d "${POSTGRES_DB:-construction_cms}" > "${DEST}/database.dump"

echo "[$(date -u +%FT%TZ)] files → ${DEST}/files"
${COMPOSE} run --rm --no-deps -T -v "$(pwd)/${DEST}:/backup" --entrypoint /bin/sh minio-init -c \
  "mc alias set local http://minio:9000 \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" >/dev/null && mc mirror --quiet local/${BUCKET} /backup/files"

find backups -mindepth 1 -maxdepth 1 -type d -mtime "+${KEEP_DAYS}" -exec rm -rf {} +
echo "[$(date -u +%FT%TZ)] done: $(du -sh "${DEST}" | cut -f1)"
