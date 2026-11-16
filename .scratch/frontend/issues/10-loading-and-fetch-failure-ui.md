---
title: Loading and fetch-failure UI on board pages
labels:
  - wayfinder:grilling
status: open
parent: .scratch/frontend/map.md
blocked-by:
  - 07-island-vs-ssr-on-board-pages.md
---

## Question

The list (`/`) and Job page (`/:id`) are static shells whose React islands fetch in the browser ([Astro island vs SSR on board pages](07-island-vs-ssr-on-board-pages.md)): `GET /jobs` on the list, `GET /jobs/:id` on the Job page.

Decide what each island shows:

- While its request is in flight
- When that request fails (network error, 5xx, or any non-OK that is not the missing/not-open Job cases below)

Do not pick empty list (zero open Jobs) or missing/not-open Job (`404` / `403` on `GET /jobs/:id`); that is [Empty list and missing-Job handling](09-empty-list-and-missing-job.md). Do not pick which fields a successful fetch shows; that is [Job fields on the list and on a Job page](08-job-fields-on-the-list-and-job-page.md). Do not add apply. Do not change Hono status codes.
