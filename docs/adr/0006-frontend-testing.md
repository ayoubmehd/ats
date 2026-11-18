---
status: accepted
---

# Component tests at React island seams with Vitest

ADR 0002 deferred frontend and end-to-end browser testing. First UI slices now
exist in `src/web`, so this ADR locks the frontend half of that follow-up.

**Component tests at React island seams** are in the web package (`src/web`).
The default tools are **Vitest** and **React Testing Library**. Tests render
islands in jsdom and double browser `fetch` (Job reads and Auth.js CSRF/session
calls). They do not boot Astro, Hono, or Postgres.

Islands in that net for first slices: the open-Jobs list island, the Job page
island, and the `/signin` island. Astro pages and layouts stay untested shells.

End-to-end browser tests against the Astro origin stay deferred.

The server-first rule in ADR 0002 is unchanged. Route and database-backed
behavior still belongs in `src/server` integration tests.

## Considered Options

- **Playwright (or other E2E) against the Astro origin now** — rejected; the
  first slices are island fetch-and-render, which component tests cover without
  a browser driver, proxy, or Google OAuth. E2E stays a later ADR.
- **Keep deferring frontend tests** — rejected; ADR 0002 required a follow-up
  once UI work started, and the islands have specified loading, empty, missing,
  and failure copy.
- **Vitest without Testing Library (assert on React internals)** — rejected;
  the locked copy and `aria-busy` states are user-visible.

## Consequences

- Add Vitest, jsdom, and React Testing Library in `src/web`. Root `pnpm test`
  runs the server suite, then the web suite.
- Island tests supply Job JSON and Auth.js responses through `fetch` doubles.
  They do not hit Hono.
- Do not add Playwright or other E2E runners in this ADR.
- Do not treat Astro page modules as the test seam.
