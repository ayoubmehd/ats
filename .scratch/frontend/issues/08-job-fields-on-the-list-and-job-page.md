---
title: Job fields on the list and on a Job page
labels:
  - wayfinder:grilling
status: open
parent: .scratch/frontend/map.md
blocked-by: []
---

## Question

First slices have an open-Jobs list page and a Job page ([Which pages the open-Jobs board has](05-which-pages-the-open-jobs-board-has.md)). `GET /jobs` and `GET /jobs/:id` return the same Job: `id`, `title`, `summary`, `content`, `status`, `posterId`. Changing the Hono API is out of scope.

Decide which of those fields the list shows and which the Job page shows. The two pages may differ.

Do not pick empty list or missing-Job handling; that is [Empty list and missing-Job handling](09-empty-list-and-missing-job.md). Do not pick URL paths; that is [Navigation and information architecture for the board](06-navigation-and-ia-for-the-board.md). Do not add apply.
