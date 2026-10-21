---
title: Which users a candidate list returns
labels:
  - wayfinder:grilling
status: open
assignee:
parent: .scratch/authorization/map.md
blocked-by: []
---

## Question

`GET /candidates` and `GET /candidates/:id` are allowed for an admin and a recruiter. A Candidate and an anonymous caller get 403 (or 401 when there is no session). The glossary says a Candidate is a User whose role is candidate, not a separate table. The current list returns every non-deleted User, including recruiters and admins.

Decide whether a successful candidate read returns only Users with role candidate. Cover both the list and the read-by-id.

If a recruiter or admin fetches an id whose role is recruiter or admin, say whether that is 404 or 403. A soft-deleted User stays 404, which ADR 0004 already decided.
