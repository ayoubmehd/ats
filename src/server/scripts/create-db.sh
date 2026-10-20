#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DB_NAME="${1:-}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

usage() {
  echo "Usage: $0 <database_name>"
  echo
  echo "Creates a PostgreSQL database inside the docker compose postgres service."
  echo "Example: $0 ats_test"
  exit 1
}

if [[ -z "$DB_NAME" ]]; then
  usage
fi

if [[ ! "$DB_NAME" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "Error: invalid database name '$DB_NAME' (use letters, numbers, and underscores)"
  exit 1
fi

cd "$SERVER_DIR"

echo "Starting postgres container (if needed)..."
docker compose up -d postgres

echo "Waiting for postgres to be ready..."
until docker compose exec -T postgres pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1; do
  sleep 1
done

echo "Creating database '$DB_NAME' in postgres container..."
docker compose exec -T postgres psql -U "$POSTGRES_USER" -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '$DB_NAME') THEN
    EXECUTE format('CREATE DATABASE %I', '$DB_NAME');
    RAISE NOTICE 'Created database %', '$DB_NAME';
  ELSE
    RAISE NOTICE 'Database % already exists', '$DB_NAME';
  END IF;
END
\$\$;
SQL

echo "Done."
