# ATS

A small applicant tracking system: recruiters post jobs, candidates apply, and recruiters move each application through a hiring pipeline.

The API is TypeScript, [Hono](https://hono.dev) with Zod/OpenAPI, [Drizzle ORM](https://orm.drizzle.team), and PostgreSQL. The browser app is [Astro](https://astro.build) with React islands (ADR 0005). Server tests are integration tests that run every route against a real Postgres test database.

## Where to look

- [`CONTEXT.md`](CONTEXT.md): domain language (what a User, Candidate, Job, and Application mean here).
- [`AGENTS.md`](AGENTS.md): how agent sessions grill, ticket, and implement work.
- [`docs/adr/`](docs/adr): decisions and the options that were rejected.
- [`docs/pipeline.md`](docs/pipeline.md): the hiring pipeline state machine.
- [`src/server/src/routes/applications.ts`](src/server/src/routes/applications.ts): the pipeline rules enforced in the API.
- [`ISSUES.md`](ISSUES.md): known problems from a code review, triaged by severity.

## Run it

Requires Node (see `.nvmrc`), pnpm, and Docker. Install once from the repo root.

```sh
pnpm install
cd src/server
docker compose up -d
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ats_db" > .env
pnpm db:migrate
```

Then two processes from the repo root:

```sh
pnpm dev:server
pnpm dev:web
```

The API runs on http://localhost:3000. The app runs on http://localhost:4321 and proxies `/auth`, `/jobs`, `/candidates`, and `/applications` to the API.

When developing the app, set `AUTH_URL=http://localhost:4321/auth` in the server env and add `http://localhost:4321/auth/callback/google` to the Google OAuth redirect URIs. Server tests keep `AUTH_URL=http://localhost:3000/auth`.

The API reference is at http://localhost:3000/-/scalar. `/-/docs`, `/-/scalar`, and `/-/db/health` require a signed-in user whose role is `dev`.

## Test it

The first time Postgres initializes its data volume, Compose also creates `ats_test`.

```sh
cd src/server
docker compose up -d
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ats_test pnpm db:migrate
pnpm test
```

A volume created before that init script existed does not gain `ats_test` on restart. Create it without deleting data:

```sh
cd src/server
./scripts/create-db.sh ats_test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ats_test pnpm db:migrate
```

Frontend and E2E tests are not in this repo yet (ADR 0002).

## Status

Work in progress. The browser app is an empty shell; product screens wait on the `.scratch/frontend/` wayfinder map.
