---
status: accepted
---

# Auth.js with database sessions and role-based authorization

We authenticate users with [@hono/auth-js](https://github.com/honojs/middleware/tree/main/packages/auth-js),
the Hono middleware for [Auth.js](https://authjs.dev/). Auth config, route handling, and
session verification go through `@hono/auth-js` (`initAuthConfig`, `authHandler`,
`verifyAuth`); we do not mount `@auth/core` directly. `@auth/core` remains a dependency
for providers and types only.

Sessions use the **database strategy**: a signed HTTP-only cookie holds a session token;
session state and the linked user are stored in PostgreSQL via the Drizzle adapter
(`DrizzleAdapter` from `@hono/auth-js`). Protected routes use `verifyAuth()` to resolve
the session into `c.get('authUser')`; authorization middleware then checks `role`
(`admin`, `recruiter`, `candidate`) and resource ownership before handlers execute.

Auth.js session tables (`sessions`, `accounts`, `verification_tokens`) are added alongside
the existing `users` table defined in ADR 0001. The adapter links Auth.js identities to
`users` rows by email. Candidates remain users with `role = 'candidate'` — no separate
auth model.

## Considered Options

- **JWT bearer tokens** — rejected for now; no mobile or third-party API consumers exist,
  and bearer tokens add client-side storage risk without a clear benefit for a browser-facing
  internal ATS. Auth.js JWT-in-cookie is also rejected: sessions cannot be revoked without
  extra infrastructure, and role changes would lag behind token expiry.
- **Mount `@auth/core` directly on Hono** — rejected; `@hono/auth-js` wraps Auth.js with
  Hono-native middleware, context injection (`authUser`), and a Drizzle adapter aligned
  with this stack.
- **Roll-your-own session middleware** — rejected; Auth.js provides battle-tested cookie
  handling, CSRF defaults, and provider extensibility (credentials, OAuth) with less custom
  security surface.
- **Separate auth service** — rejected; single Hono server and shared Postgres keep
  deployment and testing simple at current scale.
- **Session store outside Postgres (Redis, etc.)** — rejected; Postgres is already the
  system of record; a second session store adds ops cost with no current scaling need.

## Consequences

- Add `@hono/auth-js` and `@auth/core`; add Auth.js Drizzle schema tables and migrate via
  drizzle-kit (same flow as ADR 0001).
- Wire auth in `app.ts`: `initAuthConfig` globally, `authHandler()` on `/auth/*`, and
  `verifyAuth()` on protected route groups. Add `requireRole` middleware on top of
  `authUser` where role checks are needed.
- Remove hardcoded email lookups in routes (`recruiter@example.com`, `TEST_EMAIL`) and
  bind actions to `c.get('authUser')` — closes [#1](https://github.com/ayoubmehd/ats/issues/1).
- Define per-route authorization rules, e.g.:
  - `GET /applications` — recruiter or admin; scoped to jobs where `posterId` matches the user
  - `POST /applications` — authenticated candidate; `candidateId` set from session, not body
  - `POST /applications/:id/next-stage` and `/reject` — recruiter who owns the job
  - `GET /candidates`, `GET /candidates/:id` — recruiter or admin only
  - Candidate mutations (`POST`/`PUT`/`DELETE /candidates`) — admin only
  - Job mutations — recruiter (own jobs) or admin
- Route tests need a session helper (sign-in + forward cookie) or middleware injection;
  extend the server-first testing approach from ADR 0002.
- Frontend auth (login UI, cookie forwarding, CORS/`SameSite` config) deferred until a
  frontend ADR; this ADR covers server-side auth only.
- `AUTH_SECRET`, `AUTH_URL`, and provider credentials become required environment variables;
  document in `.env` examples, never commit secrets.
