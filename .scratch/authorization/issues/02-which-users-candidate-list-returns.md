---
title: Which users a candidate list returns
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/authorization/map.md
blocked-by: []
---

## Question

`GET /candidates` and `GET /candidates/:id` are allowed for an admin and a recruiter. A Candidate and an anonymous caller get 403 (or 401 when there is no session). The glossary says a Candidate is a User whose role is candidate, not a separate table. The current list returns every non-deleted User, including recruiters and admins.

Decide whether a successful candidate read returns only Users with role candidate. Cover both the list and the read-by-id.

If a recruiter or admin fetches an id whose role is recruiter or admin, say whether that is 404 or 403. A soft-deleted User stays 404, which ADR 0004 already decided.

## Resolution

A successful `GET /candidates` and `GET /candidates/:id` return only Users with role `candidate` and `deletedAt` null. Both routes use that same set.

`GET /candidates` is that list. `GET /candidates/:id` for a User with role `recruiter` or `admin` is 404, the same as a missing id or a soft-deleted User: there is no Candidate with that id.

A Candidate caller, or a caller with no session, stays outside the route (403 or 401). The body of those responses is [What 401 and 403 responses look like](05-401-and-403-response-shape.md).

Admin `PUT` and `DELETE` when the id is not a Candidate are [What an admin write does when the user is not a candidate](06-admin-write-when-user-is-not-a-candidate.md).
