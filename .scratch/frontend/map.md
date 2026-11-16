---
title: Lock the ATS frontend for first UI slices
labels:
  - wayfinder:map
status: open
---

## Destination

A locked decision set an `/implement` session can follow to build the first UI slices, with nothing left to decide. This map does not implement screens.

## Notes

ATS browser app in `src/web`. Before choosing a ticket, read `CONTEXT.md`, `docs/adr/0003-authentication.md`, `docs/adr/0004-authorization.md`, and `docs/adr/0005-frontend-astro-react.md`. Stack, same-origin proxy, Tailwind-as-engine, and React islands are already locked in ADR 0005. Authentication stays as ADR 0003 implemented it (database sessions, Google, HTTP-only cookies).

This map records decisions only. Implementation starts after no tickets remain.

Each session consults the grilling and domain-modeling skills.

Tracker: local markdown in `.scratch/frontend/`. A ticket is a child when its front matter `parent` is this file. Claim a ticket by setting `assignee` before any work. Blocking is the `blocked-by` list of sibling paths. A ticket is unblocked when every entry there is `status: closed` (an empty list is unblocked). The frontier is the open, unblocked, unclaimed children, in filename order.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Which product surface is first](issues/01-which-product-surface-is-first.md): public open-Jobs list and read for every caller; apply and recruiter pipeline wait.

## Not yet specified

- Job fields on the list and on a Job page. Hangs on which pages exist.
- Empty list and missing-Job handling. Hangs on which pages exist.

## Out of scope

- Product UI in the factory setup pass that created this map.
- Changing the Hono API.
- Mobile apps.
- A frontend test runner until its ADR exists.
- Application create UI (apply). First slices are list and read only.
- Recruiter pipeline UI. Later effort.
