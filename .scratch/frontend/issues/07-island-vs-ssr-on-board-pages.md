---
title: Astro island vs SSR on board pages
labels:
  - wayfinder:grilling
status: open
parent: .scratch/frontend/map.md
blocked-by:
  - 05-which-pages-the-open-jobs-board-has.md
---

## Question

ADR 0005 locked a static shell plus `@astrojs/node`, with `prerender = false` when a page needs SSR. React is only an island. The first surface is a public open-Jobs board; list data is open Jobs for every caller, so the list does not change with session.

For the list page and the Job page ([Which pages the open-Jobs board has](05-which-pages-the-open-jobs-board-has.md)), decide:

- Static page plus a React island that fetches `/jobs` and `/jobs/:id` on the client, or
- SSR (`prerender = false`) that loads those same same-origin routes on the server

Name one default for the board pages. Call out a page only if it differs.

Do not pick the visual kit; that is [Visual system on top of Tailwind](02-visual-system.md). Do not add Astro endpoints that duplicate Hono.
