---
title: Enforce ADR 0004 authorization
labels:
  - wayfinder:map
status: closed
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
- [Which users a candidate list returns](issues/02-which-users-candidate-list-returns.md): list and read-by-id return only Users with role candidate; a recruiter or admin id is 404.
- [Which applications stay visible across job status and soft delete](issues/03-application-visibility-by-job-state.md): closed and draft Jobs stay in the list inside role scope; a soft-deleted Job stays visible only to an admin, who may still advance or reject, while a recruiter gets 404.
- [What a valid session means after the user is soft-deleted](issues/04-session-after-user-soft-deleted.md): a soft-deleted User no longer establishes an active identity; required routes return 401, while public Job reads apply anonymous open-only scope.
- [What 401 and 403 responses look like](issues/05-401-and-403-response-shape.md): 401 `{ message: "Unauthorized" }` for a missing session and a soft-deleted caller; 403 `{ message: "Forbidden" }` for both role and ownership failures.
- [What an admin write does when the user is not a candidate](issues/06-admin-write-when-user-is-not-a-candidate.md): PUT and DELETE on a live recruiter or admin are 404 and leave that User unchanged; POST restores a soft-deleted Candidate with that email, and returns 400 when the email belongs to anyone else; PUT of a live Candidate returns that same 400 when the new email is taken.
- [What interface the authorization module exposes](issues/07-authorization-module-interface.md): `resolveCaller` turns the session into an active User or an anonymous caller; the route loads the row; `decide` returns allow with a scope tag or a poster source, or unauthorized, forbidden, or not_found with a message; the route writes HTTP.
- [Which route tests prove the authorization matrix](issues/08-authorization-route-test-matrix.md): only the gaps in the current tests, with each router proving every distinct outcome once and each allow scope checked by list membership; the GET /jobs no-cookie 401 test is removed, and the recruiter Candidate write tests switch to an admin.

## Not yet specified

None.

## Out of scope

- Admin `posterId` on create, and changing `posterId` on update. Ruled out while charting. Implementers follow only what ADR 0004 already says: a recruiter's `posterId` is forced to themselves, and an admin may set `posterId`.
- The status code when someone applies to a Job that exists but is not open. Ruled out while charting. Applying still requires an open Job, which ADR 0004 already says.
- Health, OpenAPI, and Scalar routes stay as they are.
- How a new Google sign-in gets a role stays with authentication.
- Frontend login stays deferred.
- No new `GET /applications/:id` route.
- Pipeline transition rules stay as they are. Which status may advance or be rejected is not an authorization decision.
