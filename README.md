# ATS

A small applicant tracking system API: recruiters post jobs, candidates apply, and recruiters move each application through a hiring pipeline.

Built with TypeScript, [Hono](https://hono.dev) with Zod/OpenAPI, [Drizzle ORM](https://orm.drizzle.team), and PostgreSQL. Tests are integration tests that run every route against a real Postgres test database.

## Where to look

- [`CONTEXT.md`](CONTEXT.md): domain language (what a User, Candidate, Job, and Application mean here).
- [`docs/adr/`](docs/adr): decisions and the options that were rejected.
- [`docs/pipeline.md`](docs/pipeline.md): the hiring pipeline state machine.
- [`src/server/src/routes/applications.ts`](src/server/src/routes/applications.ts): the pipeline rules enforced in the API.
- [`ISSUES.md`](ISSUES.md): known problems from a code review, triaged by severity.

## Run it

Requires Node (see `.nvmrc`), pnpm, and Docker.

```sh
cd src/server
pnpm install
docker compose up -d
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ats_db" > .env
pnpm db:migrate
pnpm dev
```

The API runs on http://localhost:3000, and the API reference is at http://localhost:3000/-/scalar.

## Test it

```sh
cd src/server
docker compose exec postgres createdb -U postgres ats_test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ats_test pnpm db:migrate
pnpm test
```

## Status

Work in progress. Authentication is in review in [#27](https://github.com/ayoubmehd/ats/pull/27); until it lands, routes act as a hardcoded recruiter or candidate.
