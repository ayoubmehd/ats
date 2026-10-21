---
title: How job reads tell anonymous callers from signed-in roles
labels:
  - wayfinder:grilling
status: open
assignee:
parent: .scratch/authorization/map.md
blocked-by: []
---

## Question

`GET /jobs` and `GET /jobs/:id` allow a caller with no session, and only for a Job whose status is open. Every other route requires a session. Today `verifyAuth()` is mounted on the whole jobs router, and it rejects a missing session with 401.

Decide how those two reads accept an anonymous caller while every other route still requires a session. Name the mechanism an implementer should use.

Do not reopen the permission matrix. Anonymous and Candidate see open Jobs. A recruiter also sees their own Jobs in any status. An admin sees every Job. A missing or soft-deleted Job is 404. An existing Job outside the caller's scope is 403.
