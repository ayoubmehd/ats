---
title: Empty list and missing-Job handling
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/frontend/map.md
blocked-by: []
---

## Question

First slices have an open-Jobs list page and a Job page ([Which pages the open-Jobs board has](05-which-pages-the-open-jobs-board-has.md)). The list can have zero open Jobs. The Job page can fail to show a Job: `GET /jobs/:id` is 404 when the Job is missing or soft-deleted, and 403 when it exists but is not open for this caller (draft or closed).

Decide:

- What the list page shows when there are no open Jobs
- What the Job page shows when that Job cannot be read as open

Do not pick which fields a successful list or Job page shows; that is [Job fields on the list and on a Job page](08-job-fields-on-the-list-and-job-page.md). Do not pick URL paths; that is [Navigation and information architecture for the board](06-navigation-and-ia-for-the-board.md). Do not add apply. Do not change Hono status codes.

## Resolution

On the list (`/`), after the island keeps only open Jobs, **zero rows** show **No open jobs**. No rows, no fake table chrome. Shared header stays.

On the Job page (`/:id`), **404**, **403**, and **200 with status not open** share one treatment. Stay on `/:id`. The island body is **Job not available**. Do not show Hono’s `Forbidden` or `Job not found`. No extra back link. Never render draft or closed fields on this board.

Loading, network, and other non-OK fetches stay [Loading and fetch-failure UI on board pages](10-loading-and-fetch-failure-ui.md).
