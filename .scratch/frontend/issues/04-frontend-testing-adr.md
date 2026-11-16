---
title: Frontend testing ADR
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/frontend/map.md
blocked-by: []
---

## Question

ADR 0002 is server-first. It requires a follow-up ADR for frontend and end-to-end browser testing. No Vitest or Playwright lives in `src/web` yet.

Decide what that follow-up ADR should lock:

- Component tests at React island seams, and/or
- End-to-end browser tests against the Astro origin (with the API proxied), and/or
- Continue deferring until the first UI slices exist

Name the strategy and the default tool. Do not write the ADR in this ticket; the resolution is the decision the ADR will record.

Do not change the server-first rule in ADR 0002. Do not add a test runner in this ticket.

## Resolution

The follow-up ADR ADR 0002 required (next number after 0005) locks **component tests at React island seams**. Default tool: **Vitest + React Testing Library in the web package** (`src/web`). End-to-end browser tests against the Astro origin stay deferred.

Islands in that net for first slices: the open-Jobs board islands and the `/signin` island. Do not lock how tests supply Job data or auth calls. Implementers choose that after [Astro island vs SSR on board pages](07-island-vs-ssr-on-board-pages.md) for board islands; they choose the sign-in island's test double themselves (that ticket does not cover `/signin`).

Do not change the server-first rule in ADR 0002. Do not write the ADR file or add a runner in this ticket. A runner stays out of scope on this map until that ADR exists.
