---
status: accepted
---

# Astro with React islands, same-origin API proxy

The ATS browser app lives at `src/web` (package name `web`) alongside `src/server`.
It is Astro with `@astrojs/react` and TypeScript. Pages and layouts are the shell;
React is only an island (`client:*`). Tailwind is the CSS engine. No component kit
is chosen here.

Output is the Astro 5 equivalent of hybrid: `output: "static"` plus `@astrojs/node`
so a page can opt into SSR with `prerender = false`. Session-aware pages can SSR
later; the scaffold itself stays a static shell.

The browser origin is Astro. In development, the Vite proxy forwards `/auth`,
`/jobs`, `/candidates`, and `/applications` to Hono on port 3000. Production uses
the same prefixes behind one reverse proxy. Auth.js HTTP-only cookies stay host-only
on the Astro origin. There is no CORS-with-credentials setup for v1. Hono remains
the only API; Astro does not grow endpoints that duplicate it.

This ADR does not add product screens. Frontend and E2E tests stay deferred as
ADR 0002 required; a wayfinder ticket exists for the follow-up ADR.

## Considered Options

- **SPA-only Vite React** — rejected; the hiring UI is mostly lists and forms, and
  Astro keeps the shell cheap while React islands cover the interactive bits.
- **Separate origins with CORS cookies** — rejected; ADR 0003 sessions are
  host-only cookies. Splitting `localhost:4321` from `localhost:3000` without a
  proxy forces credentialed CORS and `SameSite` work that a same-origin proxy
  avoids.
- **Astro endpoints as a second API** — rejected; OpenAPI, auth, and authorization
  already live on Hono. A second API would drift.
- **JWT in localStorage** — rejected; contradicts ADR 0003 database sessions.

## Consequences

- Root becomes a pnpm workspace (`src/server`, `src/web`). Install from the repo
  root; there is one lockfile.
- For web-dev, `AUTH_URL` is the Astro origin (e.g. `http://localhost:4321/auth`).
  The Google OAuth redirect URI must include
  `http://localhost:4321/auth/callback/google`. Server tests keep
  `AUTH_URL=http://localhost:3000/auth`.
- Browser fetches use same-origin paths (`/jobs`, `/applications`, `/candidates`,
  `/auth`), never a hardcoded `localhost:3000`.
- Sign-in UI, first product surface, visual kit, and frontend tests are not
  decided here. They belong on the `.scratch/frontend/` wayfinder map.
