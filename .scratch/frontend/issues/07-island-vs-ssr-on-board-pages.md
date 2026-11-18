---
title: Astro island vs SSR on board pages
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
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

## Resolution

The list (`/`) and the Job page (`/:id`) stay **static** (do not set `prerender = false`). Each is a thin Astro shell plus a shadcn React island, same split as [Visual system on top of Tailwind](02-visual-system.md).

The **list island fetches `GET /jobs` in the browser**. The **Job page island fetches `GET /jobs/:id` in the browser**. Astro may pass the route `id` into the Job island as a prop; the island still performs the fetch. Do not SSR-load those routes on the Astro server. Do not add Astro endpoints that duplicate Hono.

Extra rows a recruiter or admin session receives from `GET /jobs` stay hidden in the island ([Which product surface is first](01-which-product-surface-is-first.md)).

Loading and fetch-failure UI is [Loading and fetch-failure UI on board pages](10-loading-and-fetch-failure-ui.md). Empty list and missing-Job handling stay [Empty list and missing-Job handling](09-empty-list-and-missing-job.md).
