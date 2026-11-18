---
title: Loading and fetch-failure UI on board pages
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
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

## Resolution

The list (`/`) and Job page (`/:id`) islands show **shadcn Skeleton** while their GET is in flight. The shared header stays. Use Skeleton defaults (including pulse). Do not invent a custom skeleton theme.

**List:** 3 rows, each a title bar then a summary bar. **Job page:** a title bar, a summary bar, then a taller content block.

The island is `aria-busy` while in flight and includes a visually hidden **Loading** (Tailwind `sr-only`). Do not show a second visible “Loading…”.

When the fetch fails (network error, 5xx, 400, malformed or non-Job JSON, or any other non-OK that is not Job-page **403** / **404**), the island body is plain text plus a default shadcn **Button** labeled **Retry** under the sentence:

- List: **Couldn't load jobs**
- Job page: **Couldn't load this job**

Do not wrap that in Alert. Do not show Hono JSON (`Forbidden`, `Job not found`, and the rest). No extra back link.

**Retry** re-runs that page’s same GET (`/jobs` or `/jobs/:id`). While Retry is in flight, replace the failure body with the same skeleton state. A second failure shows the same failure body again.

Job-page **404**, **403**, and **200** with status not open stay [Empty list and missing-Job handling](09-empty-list-and-missing-job.md) (**Job not available**). Zero open Jobs stays **No open jobs**.

Do not add apply. Do not change Hono status codes.
