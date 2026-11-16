-- Runs once, when the Postgres data directory is first created.
-- Later restarts do not re-run scripts in docker-entrypoint-initdb.d.
-- For a volume created before this file existed:
--   ./scripts/create-db.sh ats_test
CREATE DATABASE ats_test;
