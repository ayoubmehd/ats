---
title: How an API listing maps onto a Job
labels:
  - wayfinder:grilling
status: open
parent: .scratch/seed-jobs/map.md
blocked-by:
  - 02-which-job-api-the-seed-uses.md
---

## Question

Given the API from [Which job API the seed uses](02-which-job-api-the-seed-uses.md), decide how one listing becomes one Job.

Standing preferences: `posterId` null, status `open`, `deletedAt` null, `source` `'seed'` ([How re-run replaces previous seed Jobs](03-how-rerun-replaces-previous-seed-jobs.md)), `content` is plain text, extras (company, location, salary, tags) fold into `content`, `summary` is derived from that, about 10–20 rows. Job HTTP JSON does not include `source`. Fold source credit and the listing's apply/link-back URL into `content` ([Which public job APIs can seed Jobs](01-which-public-job-apis-can-seed-jobs.md)).

Decide:

- which API fields become `title`
- how HTML or markdown in the description becomes plain-text `content`
- the exact shape of folded extras inside `content`
- how `summary` is derived (first paragraph, first N characters, or another rule)
- how we take ~10–20 listings when the response is larger, smaller, or mixed
- what we do with a listing that has no title or no description

Do not choose the fixture file format here. That is [What the committed fixture stores and when it is used](05-what-the-committed-fixture-stores.md).
