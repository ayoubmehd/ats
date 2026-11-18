---
title: How re-run replaces previous seed Jobs
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/seed-jobs/map.md
blocked-by: []
---

## Question

A second run of the seed must replace the previous seed Jobs, then insert this run's rows. The Job table has no seed marker and no external listing id. Charting ruled out new columns for company, location, salary, and tags. `posterId` null is also valid for an admin-created Job.

Decide:

- how the script recognizes Jobs it previously inserted, without expanding Job for API extras
- whether replacing those Jobs is a hard delete or a soft delete (`deletedAt`)
- what happens to recruiter-posted Jobs and to admin-created Jobs that also have `posterId` null
- whether Applications pointing at a replaced Job matter (Applications are out of scope to seed, but a local DB might already have some)

Do not pick the API here. Do not write the script.

## Resolution

Add a nullable varchar `source` on Job. Product Jobs stay `null`. This seed script writes `source = 'seed'` on insert.

A re-run **hard-deletes** Applications whose Job has `source = 'seed'`, then **hard-deletes** those Jobs. This is the seed script replacing its own rows, not `DELETE /jobs` (that route stays a soft delete). Recruiter-posted Jobs and any other Job with `source` null are left unchanged, including admin-created Jobs that only have `posterId` null.

`GET /jobs` JSON stays `id`, `title`, `summary`, `content`, `status`, `posterId`. Do not add `source` to the HTTP shape.

Company, location, salary, and tags still do not get columns; extras stay in `content` as charted. Mapping writes `source` in [How an API listing maps onto a Job](04-how-an-api-listing-maps-onto-a-job.md).
