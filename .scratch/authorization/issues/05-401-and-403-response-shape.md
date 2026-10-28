---
title: What 401 and 403 responses look like
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
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

## Resolution

All three cases use the existing JSON `{ message }` shape.

- No session on a route that requires one returns 401 `{ message: "Unauthorized" }`. A missing, invalid, or expired cookie is the same case.
- A session whose User is soft-deleted returns that same 401 on a route that requires one. The body does not say the User was deleted.
- A signed-in caller who fails a role check returns 403 `{ message: "Forbidden" }`.
- A signed-in caller who fails an ownership check when the resource exists returns that same 403. A missing or soft-deleted resource stays 404 with its current `{ message }` body.

`GET /jobs` and `GET /jobs/:id` are unchanged: no session, or a soft-deleted caller, is the anonymous open-only scope, not 401.

`verifyAuth()` today returns plain text `Unauthorized`. The client-visible contract replaces that text with this JSON. Which layer writes the body stays with [What interface the authorization module exposes](07-authorization-module-interface.md).
