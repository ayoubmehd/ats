---
title: Frontend testing ADR
labels:
  - wayfinder:grilling
status: open
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
