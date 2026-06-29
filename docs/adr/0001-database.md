---
status: accepted
---

# PostgreSQL with Drizzle schema and versioned migrations

We use PostgreSQL as the sole relational datastore for users, jobs, and applications.
Drizzle ORM owns the schema definition (`src/server/src/db/schema.ts`) and migration
tooling; routine queries use Drizzle, complex queries use raw SQL. Schema changes flow
through drizzle-kit generate + migrate with committed SQL under `src/server/drizzle/`.
Candidates are not a separate table — they are users with role=candidate. All core
tables use integer identity PKs, varchar-backed enums, and soft delete via deletedAt.
Soft-deleted rows are excluded by shared query helpers, not ad-hoc per-route filters.
Local dev runs Postgres via Docker Compose; production host is undecided. Tests use a
separate `ats_test` database.

## Considered Options

- Separate candidates table — rejected; unified users simplifies auth and the recruiter-applies edge case
- Native PG ENUM types — rejected; varchar enums are easier to evolve during early iteration.
- Migration tooling - use codebase first approch from drizzle docs option 4 [drizzle docs](https://orm.drizzle.team/docs/migrations).
- UUID primary keys — deferred; sequential integers are fine for internal ATS scope.
- Will use slugs for job and email/username for users for public facing urls to avoid exposing internal ids.

## Consequences

- Add `ats_test` to docker-compose and point `.test.env` at it (done)
- Implement repository/query helpers with soft-delete filter before routes proliferate
