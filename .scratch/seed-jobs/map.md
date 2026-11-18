---
title: Lock the Job seed script
labels:
  - wayfinder:map
status: open
---

## Destination

A locked decision set an `/implement` session can follow to add a seed script that fetches Jobs from a public job API, inserts about 10–20 of them into local/dev Postgres with `posterId` null, `source` `'seed'`, and status open, rewrites a committed fixture on a successful fetch, and falls back to that fixture when the fetch fails. A re-run hard-deletes Jobs with `source` `'seed'` and their Applications. This map does not write the script. No Users. No Application inserts. No company, location, salary, or tags columns.

## Notes

ATS Job seed for local/dev. Before choosing a ticket, read `CONTEXT.md`, `docs/adr/0001-database.md`, and `docs/adr/0004-authorization.md`. These rows are Jobs. Do not invent a glossary term for an unowned or seeded Job. `posterId` null is already valid (admin create may omit it). Seeded Jobs with status open appear on the public board; no recruiter owns them.

Standing preferences from charting:

- Jobs only. `posterId` is always null. `deletedAt` is null on insert. Status is `open`. `source` is `'seed'`.
- About 10–20 Jobs per run.
- One identification column only: nullable varchar `source`. Map title from the API; fold description plus extras (company, location, salary, tags) into `content` as plain text; derive `summary` from that. Job HTTP JSON does not include `source`.
- Always fetch the API, rewrite the committed fixture, then insert. If the fetch fails, replay the fixture.
- Target is the local/dev `ats` database via existing `DATABASE_URL`. Never `ats_test`.
- Script lives with the other server scripts under `src/server/scripts/`, invoked from the server `package.json`.
- Viable APIs from [Which public job APIs can seed Jobs](issues/01-which-public-job-apis-can-seed-jobs.md) need no paid key. Their terms require source credit and apply/link-back URLs, which fold into `content`.

This map records decisions only. Implementation starts after no tickets remain.

Each session consults the grilling and domain-modeling skills.

Tracker: local markdown in `.scratch/seed-jobs/`. A ticket is a child when its front matter `parent` is this file. Claim a ticket by setting `assignee` before any work. Blocking is the `blocked-by` list of sibling paths. A ticket is unblocked when every entry there is `status: closed` (an empty list is unblocked). The frontier is the open, unblocked, unclaimed children, in filename order.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Which public job APIs can seed Jobs](issues/01-which-public-job-apis-can-seed-jobs.md): Jobicy, Himalayas, and Remotive survive no-paid-key + live GET + ToS for fetch/fixture/local DB; Remote OK is a fourth.
- [How re-run replaces previous seed Jobs](issues/03-how-rerun-replaces-previous-seed-jobs.md): nullable Job `source`; seed writes `seed`; re-run hard-deletes those Jobs and their Applications; HTTP JSON unchanged.

## Not yet specified

- Whether the spec requires tests for the seed script, and whether those tests may hit the network. ADR 0002 covers route and DB-backed tests, not this script.
- If [Which job API the seed uses](issues/02-which-job-api-the-seed-uses.md) picks Himalayas' optional Bearer key or the USAJOBS fallback, where that secret lives.

## Out of scope

- Users. This seed inserts Jobs only.
- Inserting Applications. Re-run may hard-delete Applications that already point at `source = 'seed'` Jobs.
- Expanding Job with company, location, salary, or tags columns. Extras fold into `content`. `source` is the identification exception.
- Seeding `ats_test`. Tests already truncate Jobs.
- Writing the script in this map. `/implement` does that after the map is empty.
- Production seeding.
- Recruiter-owned Jobs (`posterId` set to a User).
- Mixed draft or closed statuses. Every seeded Job is open.
