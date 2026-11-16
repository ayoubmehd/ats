---
title: Which product surface is first
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
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

## Resolution

First UI slices serve a **public open-Jobs board**: list open Jobs and read an open Job (the two public GET routes). Applying is not in those slices. The recruiter pipeline is not in those slices.

The board UI is the same for every caller: anonymous, Candidate, recruiter, admin, and dev. It renders only Jobs whose status is open. Extra rows a recruiter or admin session would receive from `GET /jobs` are not shown. Do not add a Hono query for this; changing the API is out of scope for this map.

Which pages carry list vs read is [Which pages the open-Jobs board has](05-which-pages-the-open-jobs-board-has.md). Where those pages live is [Navigation and information architecture for the board](06-navigation-and-ia-for-the-board.md). Sign-in starting path and post-Google landings stay [Sign-in UX after Google](03-sign-in-ux.md).
