---
title: Which job API the seed uses
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/seed-jobs/map.md
blocked-by:
  - 01-which-public-job-apis-can-seed-jobs.md
---

## Question

Pick one public job-listing API for the seed script, from the options in [Which public job APIs can seed Jobs](01-which-public-job-apis-can-seed-jobs.md) ([findings](../research/public-job-apis.md)). Recommended shortlist: Jobicy, Himalayas, Remotive. Remote OK is a fourth.

Decide:

- which API
- whether a key is required, and if so that a later ticket must place it
- that its terms allow a committed fixture plus local DB insert

Do not map fields here. That is [How an API listing maps onto a Job](04-how-an-api-listing-maps-onto-a-job.md).

## Resolution

The seed uses **Jobicy**. Call the public `GET https://jobicy.com/api/jobs`. No auth. No required User-Agent. Do not buy or store the optional Commercial Bearer key. A later ticket for secret placement is not needed.

Jobicy terms allow fetch, a committed fixture in this public repo, and insert into the local/dev `ats` database, if mapping folds Jobicy credit and the listing `url` into `content` and does not present the rows as original ATS postings. Automated use is at most once per hour. The feed is listings from the last 7 days, delayed 3 hours.

These rows stay Jobs. `posterId` stays null. Field mapping is [How an API listing maps onto a Job](04-how-an-api-listing-maps-onto-a-job.md). The fixture file is [What the committed fixture stores and when it is used](05-what-the-committed-fixture-stores.md).
