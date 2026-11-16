---
title: Navigation and information architecture for the board
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/frontend/map.md
blocked-by:
  - 05-which-pages-the-open-jobs-board-has.md
---

## Question

The first surface is a public open-Jobs board. The pages are the list and the Job page ([Which pages the open-Jobs board has](05-which-pages-the-open-jobs-board-has.md)).

Decide:

- Which path on the Astro origin is the list (including whether it is `/`)
- Which path is the Job page
- What chrome the first slices include (header, links between those pages, whether a link to `/signin`). Google starts at `/signin`; that path is [Sign-in UX after Google](03-sign-in-ux.md). After a session, every role lands on the list; this ticket names that list path.

Do not inventory pages here. Do not add apply or a recruiter pipeline.

## Resolution

The open-Jobs **list is `/`**. After Google, every role lands here (`callbackUrl` `/`). A signed-in User who opens `/signin` is sent here.

The **Job page is `/:id`**, where `id` is numeric `Job.id` (for example `/42`). `/signin` stays a static Astro page and wins over `/:id`. Static files (favicon) stay as they are.

Do not change the Vite or production proxy. ADR 0005 prefixes stay: `/jobs`, `/auth`, `/candidates`, `/applications`. Browser Job fetches stay `/jobs` and `/jobs/:id`. Astro pages never live under those prefixes.

Chrome is on the list and Job page only: a **shared header**, product name links to `/`, Sign in links to `/signin` and is always shown (not session-aware). List rows link to `/:id`. No extra back link, no sign-out, no role nav. `/signin` does not use this board header.

Do not add apply or a recruiter pipeline.
