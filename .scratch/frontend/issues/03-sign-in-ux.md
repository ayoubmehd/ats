---
title: Sign-in UX after Google
labels:
  - wayfinder:grilling
status: open
parent: .scratch/frontend/map.md
blocked-by: []
---

## Question

Auth.js with Google and database sessions is already on Hono (ADR 0003). The browser origin is Astro; `/auth` is proxied (ADR 0005). There is no login UI yet.

Decide:

- Where the User starts Google sign-in (which path on the Astro origin)
- Where Google returns them
- Where each role lands after a successful session: admin, recruiter, candidate, dev

Anonymous Users may still read open Jobs; that stays as ADR 0004. Do not change how roles are assigned on first Google sign-in.

Do not pick the first hiring surface here; that is [Which product surface is first](01-which-product-surface-is-first.md).
