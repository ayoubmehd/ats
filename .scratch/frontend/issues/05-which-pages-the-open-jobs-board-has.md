---
title: Which pages the open-Jobs board has
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/frontend/map.md
blocked-by: []
---

## Question

The first surface is a public open-Jobs board: list open Jobs and read an open Job. Applying is out of scope.

Decide which pages the first slices include:

- A list page only (open Job fields the list needs; no dedicated Job page)
- A list page and a Job page (`GET /jobs` and `GET /jobs/:id` each have a page)

Do not pick URL paths; that is [Navigation and information architecture for the board](06-navigation-and-ia-for-the-board.md). Do not pick island vs SSR; that is [Astro island vs SSR on board pages](07-island-vs-ssr-on-board-pages.md). Do not choose Job fields or empty states here; those hang on this answer.

Do not add apply. Do not reopen [Which product surface is first](01-which-product-surface-is-first.md).

## Resolution

First slices include two pages: an **open-Jobs list page** and a **Job page**. `GET /jobs` has the list page; `GET /jobs/:id` has the Job page. Apply stays off both.

URL paths stay [Navigation and information architecture for the board](06-navigation-and-ia-for-the-board.md). Island vs SSR stays [Astro island vs SSR on board pages](07-island-vs-ssr-on-board-pages.md). Which Job fields each page shows is [Job fields on the list and on a Job page](08-job-fields-on-the-list-and-job-page.md). Empty list and missing-Job handling is [Empty list and missing-Job handling](09-empty-list-and-missing-job.md).
