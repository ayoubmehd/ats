---
title: Which public job APIs can seed Jobs
labels:
  - wayfinder:research
status: closed
assignee: ayoub
parent: .scratch/seed-jobs/map.md
blocked-by: []
---

## Question

Which public job-listing APIs could supply ~10–20 Jobs for a local/dev seed, without a paid plan?

For each candidate, record from primary sources:

- auth (none vs API key vs OAuth)
- request URL and whether a browser User-Agent or other header is required
- JSON shape of one listing (title, description/HTML, company, location, salary, tags, ids)
- pagination / default page size
- rate limits
- terms of use for fetching, storing a response in git as a fixture, and inserting rows into a private local database
- whether the endpoint is still live

Prefer APIs that need no paid key. Do not pick the API in this ticket; list viable options and disqualifiers so [Which job API the seed uses](02-which-job-api-the-seed-uses.md) can choose.

Findings: [public-job-apis.md](../research/public-job-apis.md)

## Resolution

No paid-key API is required for ~10–20 local/dev Jobs. Four public JSON feeds were live on 2026-11-18 with no auth and terms that allow fetch, a committed fixture, and insert into a private local database, if source credit (and apply/link-back URLs) are folded into `content`: **Jobicy**, **Himalayas**, **Remotive**, and **Remote OK**. Recommend Jobicy, Himalayas, and Remotive to [Which job API the seed uses](02-which-job-api-the-seed-uses.md) without choosing one here.

Disqualified: 4dayweek.io (forbids populating a job board / listings database), Arbeitnow (website licence forbids copy, public display, and mirroring), Greenhouse/Lever/Ashby (one-employer careers boards, not a mixed catalog), Adzuna (org trial then licence; delete-all on termination), The Muse (Cloudflare 403; docs page is marketing), Reed (401; listing docs gone), GitHub Jobs (host dead), Indeed (API gone), We Work Remotely (RSS only). USAJOBS Search is a free-key fallback whose ToS explicitly allows copy/store/redistribute.
