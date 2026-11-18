---
title: What the committed fixture stores and when it is used
labels:
  - wayfinder:grilling
status: open
parent: .scratch/seed-jobs/map.md
blocked-by:
  - 02-which-job-api-the-seed-uses.md
---

## Question

The script always fetches the API, rewrites a committed fixture, then inserts. If the fetch fails, it replays the fixture. The API is [Which job API the seed uses](02-which-job-api-the-seed-uses.md).

Decide:

- where the fixture file lives
- whether it stores the raw API payload or already-mapped Job fields
- what counts as a fetch failure (timeout, HTTP 4xx/5xx, empty list, invalid JSON)
- whether a fallback run still replaces previous seed Jobs, or only inserts from the fixture when replace would wipe local rows on a bad fetch
- whether a missing fixture plus a failed fetch is a hard error

Do not decide field mapping here. That is [How an API listing maps onto a Job](04-how-an-api-listing-maps-onto-a-job.md).
