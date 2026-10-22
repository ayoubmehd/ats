---
title: Enforce ADR 0004 authorization
labels:
  - wayfinder:map
status: open
---

## Destination

A locked decision set an implement session can follow to enforce [ADR 0004](../../docs/adr/0004-authorization.md) with nothing left to decide. Permission rules live in a code module. The server then matches that ADR's matrix.

## Notes

ATS authorization on the Hono server. Before choosing a ticket, read `CONTEXT.md` and `docs/adr/0004-authorization.md`. Where route rules disagree, ADR 0004 wins; authentication stays as ADR 0003 implemented it (database sessions, `verifyAuth()`, Google).

The Role / Permission diagram in ADR 0004 is the vocabulary of the rules, not a schema. Do not add permission tables.

This map records decisions only. Implementation starts after no tickets remain.

Each session consults the grilling and domain-modeling skills.

Tracker: local markdown in `.scratch/authorization/`. A ticket is a child when its front matter `parent` is this file. Claim a ticket by setting `assignee` before any work. Blocking is the `blocked-by` list of sibling paths. A ticket is unblocked when every entry there is `status: closed` (an empty list is unblocked). The frontier is the open, unblocked, unclaimed children, in filename order.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [How job reads tell anonymous callers from signed-in roles](issues/01-job-reads-anonymous-and-signed-in.md): one jobs router; `optionalAuth` only on `GET /jobs` and `GET /jobs/:id` (`getAuthUser`, set `authUser` or leave it unset); every other route keeps `verifyAuth()`.

## Not yet specified

- The authorization module's interface. Routes need one place that turns a caller, an action, and a resource into allow, 403, or 404, including ownership (`posterId`, `candidateId`). Who loads the Job or Application, and what a filtered list returns, depends on which Users count as Candidates, which Applications stay visible, and what a soft-deleted caller is.
- Which new route-test cases the matrix requires. ADR 0004 asks for a session cookie per role and 401/403/404 assertions, and ADR 0002 says to grill before widening test scope. The case list still depends on which Users count as Candidates, which Applications stay visible, what a soft-deleted caller is, and what 401 and 403 responses look like.

## Out of scope

- Admin `posterId` on create, and changing `posterId` on update. Ruled out while charting. Implementers follow only what ADR 0004 already says: a recruiter's `posterId` is forced to themselves, and an admin may set `posterId`.
- The status code when someone applies to a Job that exists but is not open. Ruled out while charting. Applying still requires an open Job, which ADR 0004 already says.
- Health, OpenAPI, and Scalar routes stay as they are.
- How a new Google sign-in gets a role stays with authentication.
- Frontend login stays deferred.
- No new `GET /applications/:id` route.
- Pipeline transition rules stay as they are. Which status may advance or be rejected is not an authorization decision.
