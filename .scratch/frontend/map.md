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
- [Visual system on top of Tailwind](issues/02-visual-system.md): shadcn/ui in React islands; Astro stays a thin shell; shadcn defaults, no custom theme.
- [Sign-in UX after Google](issues/03-sign-in-ux.md): Astro `/signin` starts Google; callback `/auth/callback/google`; every role lands on the open-Jobs list.
- [Frontend testing ADR](issues/04-frontend-testing-adr.md): Vitest + Testing Library on React islands in `src/web`; E2E still deferred.
- [Which pages the open-Jobs board has](issues/05-which-pages-the-open-jobs-board-has.md): list page and a Job page; apply stays off both.
- [Navigation and information architecture for the board](issues/06-navigation-and-ia-for-the-board.md): list `/`, Job page `/:id`; header with always-on Sign in; ADR 0005 proxy prefixes stay.
- [Astro island vs SSR on board pages](issues/07-island-vs-ssr-on-board-pages.md): static shells; both islands fetch `/jobs` and `/jobs/:id` in the browser.
- [Job fields on the list and on a Job page](issues/08-job-fields-on-the-list-and-job-page.md): list title+summary; Job page title+summary+content; hide status/posterId; placeholders for missing copy; content as plain text.
- [Empty list and missing-Job handling](issues/09-empty-list-and-missing-job.md): list “No open jobs”; Job page stays on `/:id` with “Job not available” for 404, 403, and non-open 200.

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Product UI in the factory setup pass that created this map.
- Changing the Hono API.
- Mobile apps.
- A frontend test runner until its ADR exists.
- Application create UI (apply). First slices are list and read only.
- Recruiter pipeline UI. Later effort.
- Custom visual theme (colors, radius, dark mode) for first slices. Implementers keep shadcn defaults.
