#!/usr/bin/env sh
set -e

# Entrypoint shared by the 3 Render services (web, celery-worker, celery-beat).
# Env flags below let each service opt out of the DB-mutating steps:
#
#   RUN_MIGRATIONS=1        → apply Django migrations
#   COLLECT_STATIC=1        → run collectstatic
#   CREATE_MONGO_INDEXES=1  → provision Mongo indexes + TTL
#
# The Render blueprint (render.yaml) sets them ONLY on the web service so
# the workers do not race on migrations.

if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  echo "[entrypoint] Running migrations..."
  python manage.py migrate --noinput
fi

if [ "${COLLECT_STATIC:-0}" = "1" ]; then
  echo "[entrypoint] Collecting static files..."
  python manage.py collectstatic --noinput --clear
fi

if [ "${CREATE_MONGO_INDEXES:-0}" = "1" ]; then
  echo "[entrypoint] Ensuring Mongo indexes + TTL..."
  python manage.py create_mongo_indexes || echo "[entrypoint] WARN: create_mongo_indexes failed (skipping)"
fi

exec "$@"
