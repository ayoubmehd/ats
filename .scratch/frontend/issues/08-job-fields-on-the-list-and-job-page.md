---
title: Job fields on the list and on a Job page
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/frontend/map.md
blocked-by: []
---

## Question

First slices have an open-Jobs list page and a Job page ([Which pages the open-Jobs board has](05-which-pages-the-open-jobs-board-has.md)). `GET /jobs` and `GET /jobs/:id` return the same Job: `id`, `title`, `summary`, `content`, `status`, `posterId`. Changing the Hono API is out of scope.

Decide which of those fields the list shows and which the Job page shows. The two pages may differ.

Do not pick empty list or missing-Job handling; that is [Empty list and missing-Job handling](09-empty-list-and-missing-job.md). Do not pick URL paths; that is [Navigation and information architecture for the board](06-navigation-and-ia-for-the-board.md). Do not add apply.

## Resolution

The list (`/`) shows **title** and **summary**. Rows still link to `/:id`. The Job page (`/:id`) shows **title**, then **summary**, then **content**.

Do not show `status`, `posterId`, or a visible `id` on either page. `id` stays in the Job page URL and in list links only.

When `summary` is null, empty, or whitespace-only, show the placeholder **No summary** on both pages. When `content` is null, empty, or whitespace-only on the Job page, show the placeholder **No description**.

Render `content` as **plain text** and preserve newlines. Do not render Markdown or HTML.

Empty list and missing-Job handling stay [Empty list and missing-Job handling](09-empty-list-and-missing-job.md). Loading and fetch-failure UI stay [Loading and fetch-failure UI on board pages](10-loading-and-fetch-failure-ui.md).
