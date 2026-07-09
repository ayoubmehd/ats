# Code Review: Issues Report

Generated: 2026-07-08

Scope: full review of `/home/ayoub/projects/ats` — Hono API server (`src/server/`), Drizzle schema/migrations, tests, and configuration. No frontend exists yet.

## Summary

| Severity | Count |
|----------|------:|
| Critical | 3 |
| High | 7 |
| Medium | 9 |
| Low | 9 |

**Top priorities:** add authentication/authorization, remove committed credentials, scope candidate routes to `role = 'candidate'`, fix the update-candidate null dereference, add global DB error handling, and enforce terminal pipeline states for `rejected`.

No SQL injection or XSS was found (Drizzle parameterizes queries; there is no HTML rendering). The main security surface is missing auth plus exposed credentials.

---

## Critical

### ISSUE-001 — No authentication or authorization on any endpoint

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Files** | `src/server/src/routes/applications.ts` (lines 50–55, 133–137), all route files |
| **Description** | Every endpoint is publicly accessible. Applications use hardcoded identities (`recruiter@example.com`, `TEST_EMAIL` / `jane@example.com`) instead of an authenticated session. |
| **Impact** | Anyone can list, create, update, or delete candidates and jobs; submit applications as a hardcoded user; advance or reject any application; and read all recruiter applications. |
| **Suggested fix** | Add auth middleware (sessions or JWT). Bind actions to the authenticated user. Remove hardcoded email lookups. |

---

### ISSUE-002 — Database credentials committed to version control

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Files** | `src/server/src/db/.pgpass` (tracked by git), `src/server/docker-compose.yaml` (line 12) |
| **Description** | `.pgpass` contains `localhost:5432:ats_db:postgres:postgres` and is committed. Docker Compose mounts it into the Postgres container. |
| **Impact** | Credential leak to anyone with repo access. |
| **Suggested fix** | Remove from git history, add to `.gitignore`, rotate credentials, use environment variables or Docker secrets instead. |

---

### ISSUE-003 — Hardcoded default database credentials in application code

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Files** | `src/server/src/db/connection.ts` (lines 6–8) |
| **Description** | Falls back to `postgresql://postgres:postgres@localhost:5432/ats_db` when `DATABASE_URL` is unset. |
| **Impact** | A production or staging deploy without `DATABASE_URL` silently uses known default credentials. |
| **Suggested fix** | Require `DATABASE_URL` at startup; fail fast if missing. |

---

## High

### ISSUE-004 — Update candidate crashes on missing or soft-deleted ID

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Files** | `src/server/src/routes/candidates.ts` (lines 214–228) |
| **Description** | `PUT /candidates/{id}` calls `.returning()` and immediately accesses `candidate.id` without checking whether a row was updated. |
| **Impact** | `PUT` for a non-existent or soft-deleted ID throws `TypeError: Cannot read properties of undefined` → unhandled 500. |
| **Suggested fix** | Check `candidate` after update; return 404 if missing. Add a 404 response to the OpenAPI spec. |

```214:228:src/server/src/routes/candidates.ts
  const [candidate] = await db
    .update(candidatesTable)
    .set({
      username,
      email,
    })
    .where(and(eq(candidatesTable.id, id), isNull(candidatesTable.deletedAt)))
    .returning();
  return c.json(
    {
      id: candidate.id,
      username: candidate.username,
      email: candidate.email,
    },
    200,
  );
```

---

### ISSUE-005 — Candidates API does not scope to `role = 'candidate'`

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Files** | `src/server/src/routes/candidates.ts` (lines 49–57, 94–112, 211–229, 256–268) |
| **Description** | Routes query `usersTable` filtered only by `deletedAt IS NULL`, not by `role`. Per `CONTEXT.md` and `docs/adr/0001-database.md`, candidates are users with `role = 'candidate'`. |
| **Impact** | `GET /candidates` returns recruiters and admins (e.g. the seeded `recruiter@example.com`). `PUT`/`DELETE /candidates/{id}` can modify or soft-delete a recruiter, breaking `GET /applications`. |
| **Suggested fix** | Add `eq(usersTable.role, 'candidate')` to all candidate queries. Reject updates/deletes on non-candidate users with 404. |

---

### ISSUE-006 — No global error handling for database constraint violations

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Files** | All route handlers; `src/server/src/app.ts` |
| **Description** | No `onError` handler. Duplicate email, duplicate application, invalid foreign keys, etc. propagate as unhandled exceptions. |
| **Impact** | Race conditions on duplicate checks or invalid `posterId`/`jobId` yield 500 instead of 400/409. |
| **Suggested fix** | Add Hono error middleware mapping Postgres error codes (`23505` unique violation, `23503` FK violation) to appropriate HTTP responses. |

---

### ISSUE-007 — `next-stage` allows transitions from terminal `rejected` state

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Files** | `src/server/src/routes/applications.ts` (lines 120–127, 237–252); `docs/pipeline.md` (lines 15–16) |
| **Description** | `VALID_TRANSITIONS.rejected` is `"rejected"`. The handler only blocks `hired → hired`, not `rejected → rejected`. |
| **Impact** | `POST /applications/{id}/next-stage` on a rejected application returns 200 and violates documented terminal-state rules. |
| **Suggested fix** | Return 400 when `currentStage` is `rejected` or `hired` before computing the next stage. |

```120:127:src/server/src/routes/applications.ts
const VALID_TRANSITIONS = {
  applied: "screening",
  screening: "interview",
  interview: "offer",
  offer: "hired",
  rejected: "rejected",
  hired: "hired",
} as const;
```

---

### ISSUE-008 — Create application lacks job validation

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Files** | `src/server/src/routes/applications.ts` (lines 129–165) |
| **Description** | No check that `jobId` exists, is not soft-deleted, or has `status = 'open'`. |
| **Impact** | Applications can be created for deleted, draft, or closed jobs. An invalid `jobId` causes a raw FK error (500). |
| **Suggested fix** | Load the job with `isNull(deletedAt)` and `status = 'open'` before insert; return 404 or 400 as appropriate. |

---

### ISSUE-009 — Test suite shares one database with parallel file execution

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Files** | `src/server/vitest.config.js`; all `src/server/src/tests/*.test.ts` |
| **Description** | `globalSetup.ts` truncates once at start. Vitest runs test files in parallel by default. No `fileParallelism: false` or per-file DB isolation. |
| **Impact** | Tests race on shared rows (e.g. `applications-route.test.ts` lines 265–300 mutate recruiter/candidate emails while other files may be running). Flaky CI and local runs. |
| **Suggested fix** | Set `fileParallelism: false` and/or reset the DB in `beforeEach`; restore mutated seed data after destructive tests. |

---

### ISSUE-010 — Update candidate has no email uniqueness check

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Files** | `src/server/src/routes/candidates.ts` (lines 211–229) |
| **Description** | `PUT /candidates/{id}` can set `email` to one already owned by another user. |
| **Impact** | Postgres unique constraint violation → unhandled 500 instead of 400/409. |
| **Suggested fix** | Check email uniqueness excluding the current ID before update, or handle `23505` in global error middleware. |

---

## Medium

### ISSUE-011 — Delete candidate always returns 200, even when nothing was deleted

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Files** | `src/server/src/routes/candidates.ts` (lines 256–268) |
| **Description** | No check of affected rows; success is returned for non-existent or already-deleted IDs. |
| **Impact** | Clients cannot distinguish success from no-op. Inconsistent with the jobs delete route, which returns 404. |
| **Suggested fix** | Return 404 when zero rows were updated (match jobs route pattern). |

---

### ISSUE-012 — Create candidate treats soft-deleted emails as "already exists"

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Files** | `src/server/src/routes/candidates.ts` (lines 153–164) |
| **Description** | Duplicate check does not filter `deletedAt IS NULL`. |
| **Impact** | Soft-deleted candidates block re-registration with the same email (unique DB constraint + app-level check). Inconsistent with soft-delete semantics. |
| **Suggested fix** | Use a partial unique index on `email WHERE deletedAt IS NULL`, or allow email reuse for soft-deleted rows and document the behavior. |

---

### ISSUE-013 — `GET /applications` includes applications for soft-deleted jobs

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Files** | `src/server/src/routes/applications.ts` (lines 64–70) |
| **Description** | Join filters `applicationsTable.deletedAt` but not `jobsTable.deletedAt`. |
| **Impact** | Applications for deleted jobs still appear in recruiter listings. |
| **Suggested fix** | Add `isNull(jobsTable.deletedAt)` to the `where` clause. |

---

### ISSUE-014 — `updatedAt` is never updated on writes

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Files** | `src/server/src/db/schema.ts` (line 6); all update handlers |
| **Description** | `updatedAt` has `defaultNow()` only; no `$onUpdateFn` or manual set on `UPDATE`. |
| **Impact** | All records show a stale `updatedAt` after modifications. Breaks auditing and any cache invalidation keyed on modification time. |
| **Suggested fix** | Use Drizzle's `.$onUpdateFn(() => new Date())` or set `updatedAt: new Date()` in every update. |

---

### ISSUE-015 — Race condition on duplicate checks (TOCTOU)

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Files** | `src/server/src/routes/candidates.ts` (lines 153–164); `src/server/src/routes/applications.ts` (lines 146–154) |
| **Description** | SELECT-then-INSERT without a transaction or `ON CONFLICT`. |
| **Impact** | Concurrent duplicate requests can both pass the check; one crashes with 500. |
| **Suggested fix** | Use `INSERT ... ON CONFLICT DO NOTHING` and check `returning()` length, or wrap in a serializable transaction. |

---

### ISSUE-016 — `ats_test` database missing from Docker setup

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Files** | `src/server/docker-compose.yaml`; `docs/adr/0001-database.md` (line 27, marked "done") |
| **Description** | Compose creates only `ats_db`. Tests use `ats_test` (`.test.env`, `package.json` test script). |
| **Impact** | Fresh `docker-compose up` + `pnpm test` fails unless `ats_test` is created manually. ADR claims this was done; it was not. |
| **Suggested fix** | Add an init script or second database service for `ats_test`. |

---

### ISSUE-017 — Destructive tests mutate seed data without restoration

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Files** | `src/server/src/tests/applications-route.test.ts` (lines 265–300) |
| **Description** | Tests permanently change recruiter and candidate emails in the shared DB. |
| **Impact** | Pollutes DB state for subsequent tests in the same run; contributes to flakiness. |
| **Suggested fix** | Restore emails in `afterEach`/`afterAll`, or use isolated fixtures per test. |

---

### ISSUE-018 — Create application does not handle duplicate gracefully

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Files** | `src/server/src/routes/applications.ts` (lines 146–154); `src/server/src/db/schema.ts` (lines 56–58) |
| **Description** | DB enforces one application per candidate per job via unique constraint, but the route does not handle violations. |
| **Impact** | Duplicate `POST /applications` returns 500 instead of 409 Conflict. Violates `CONTEXT.md` invariant ("at most one per candidate per job"). |
| **Suggested fix** | Catch `23505` or pre-check existence; return 409 with a clear message. |

---

### ISSUE-019 — `posterId` foreign key not validated on job create/update

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Files** | `src/server/src/routes/jobs.ts` (lines 169–194, 255–265) |
| **Description** | `posterId` is optional and accepted without verifying the user exists. |
| **Impact** | Invalid `posterId` causes an unhandled FK violation (500). |
| **Suggested fix** | Validate the user exists (and has recruiter or admin role) before insert/update. |

---

## Low

### ISSUE-020 — `POST /applications` returns HTTP 200 instead of 201

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Files** | `src/server/src/routes/applications.ts` (lines 98–99, 155–165) |
| **Description** | Create endpoint uses status 200; OpenAPI spec also documents 200. |
| **Impact** | Violates REST conventions; may confuse API consumers. |
| **Suggested fix** | Return 201 and update the OpenAPI spec. |

---

### ISSUE-021 — Create application response omits `status`

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Files** | `src/server/src/routes/applications.ts` (lines 155–164) |
| **Description** | Response excludes `status` even though the DB defaults to `applied`. |
| **Impact** | Clients must guess the initial pipeline stage. |
| **Suggested fix** | Include `status: application.status` in the response. |

---

### ISSUE-022 — Hardcoded fallback candidate email in production path

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Files** | `src/server/src/routes/applications.ts` (line 137) |
| **Description** | `envVars.TEST_EMAIL ?? "jane@example.com"` — test config leaked into runtime default. |
| **Impact** | Dev/prod without `TEST_EMAIL` silently impersonates a specific user. |
| **Suggested fix** | Remove the fallback; require an authenticated user or explicit configuration. |

---

### ISSUE-023 — No input size limits on `resume` / `resumeText`

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Files** | `src/server/src/routes/applications.ts` (lines 10–14) |
| **Description** | `z.string()` accepts arbitrarily large payloads. |
| **Impact** | Potential DoS via large request bodies filling DB/disk. |
| **Suggested fix** | Add `.max(N)` to Zod schemas; configure body size limits on the server. |

---

### ISSUE-024 — API docs and health endpoints publicly exposed

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Files** | `src/server/src/app.ts` (lines 12–28, 34–47) |
| **Description** | `/-/docs`, `/-/scalar`, and `/-/db/health` have no access control. |
| **Impact** | Information disclosure (full API schema, DB health) in production. |
| **Suggested fix** | Restrict to development or protect with auth/network policy. |

---

### ISSUE-025 — Dead duplicate null-check in `next-stage` handler

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Files** | `src/server/src/routes/applications.ts` (lines 217–235) |
| **Description** | `if (!application)` is checked twice; the second block is unreachable. |
| **Impact** | Suggests incomplete refactor; obscures the missing terminal-state logic (see ISSUE-007). |
| **Suggested fix** | Remove the duplicate check; add explicit terminal-state checks instead. |

---

### ISSUE-026 — Test files hold pool connections without releasing

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Files** | `src/server/src/tests/applications-route.test.ts` (line 8); `jobs-route.test.ts` (line 7); `utils.ts` (line 5) |
| **Description** | Top-level `pool.connect()`; only `globalSetup.ts` teardown releases its client. |
| **Impact** | Connection leak pattern; may exhaust the pool as the test suite grows. |
| **Suggested fix** | Release clients in `afterAll` per file, or use a shared test helper with lifecycle management. |

---

### ISSUE-027 — `posterId` hardcoded to `null` in several application responses

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Files** | `src/server/src/routes/applications.ts` (lines 162, 262, 358) |
| **Description** | Create, next-stage, and reject responses return `posterId: null` instead of resolving it from the job. |
| **Impact** | Inconsistent with `GET /applications`, which returns the real `posterId`. |
| **Suggested fix** | Join the job or include `posterId` from the related job in responses. |

---

### ISSUE-028 — OpenAPI `CandidateSchema.id` example is a string

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Files** | `src/server/src/routes/candidates.ts` (lines 22–24) |
| **Description** | `z.number().openapi({ example: "121" })` — example type does not match schema type. |
| **Impact** | Misleading generated API docs (not a runtime bug). |
| **Suggested fix** | Use numeric example `121`. |

---

## Test Coverage Gaps

These behaviors are buggy but not covered by tests:

| Untested behavior | Relevant file |
|-------------------|---------------|
| Update non-existent candidate → 500 | `candidates-route.test.ts` |
| Delete non-existent candidate → false 200 | `candidates-route.test.ts` |
| `GET /candidates` returns only candidates (not recruiters) | `candidates-route.test.ts` |
| Duplicate application → graceful 409 | `applications-route.test.ts` |
| `next-stage` on rejected application → should be 400 | `applications-route.test.ts` |
| Apply to deleted or closed job | `applications-route.test.ts` |
| Update candidate to duplicate email | `candidates-route.test.ts` |
| Parallel test isolation | `vitest.config.js` |

---

## Architecture Debt (not runtime bugs)

These are documented intentions not yet implemented:

- **ADR 0001** calls for shared query helpers with soft-delete filters; routes use ad-hoc `isNull(deletedAt)` per handler instead.
- **ADR 0001** marks `ats_test` docker-compose setup as done; it is not (see ISSUE-016).
