---
title: What 401 and 403 responses look like
labels:
  - wayfinder:grilling
status: open
assignee:
parent: .scratch/authorization/map.md
blocked-by: []
---

## Question

`verifyAuth()` answers a missing session with plain text `Unauthorized` and HTTP 401. Route handlers return JSON `{ message }` for other errors. ADR 0004 requires 401 when a session is missing on a non-public route, and 403 when the caller is signed in but outside their permission or ownership.

Decide the status and body for three cases:

- no session on a route that requires one
- a signed-in caller who fails the role check
- a signed-in caller who fails an ownership check when the resource exists

Say whether each body matches the existing JSON `{ message }` shape.
