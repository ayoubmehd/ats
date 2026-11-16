---
title: Which product surface is first
labels:
  - wayfinder:grilling
status: open
parent: .scratch/frontend/map.md
blocked-by: []
---

## Question

The empty Astro shell at `src/web` has no product screens. ADR 0005 does not pick an audience.

Decide which surface the first UI slices serve:

- Recruiter pipeline (jobs the recruiter posted, applications moving through stages)
- Candidate job board (open jobs, apply)
- Sign-in shell only (Google return, then a role-aware landing with no hiring screens yet)

Name one first surface. Do not inventory every page; that hangs on this answer.

Do not reopen ADR 0005 (Astro, React islands, same-origin proxy, Tailwind as CSS engine).
