---
title: What interface the authorization module exposes
labels:
  - wayfinder:prototype
status: open
assignee:
parent: .scratch/authorization/map.md
blocked-by:
  - 05-401-and-403-response-shape.md
  - 06-admin-write-when-user-is-not-a-candidate.md
---

## Question

Define the permission module's interface closely enough that an implementer can use it without making authorization decisions.

Decide:

- how routes identify the caller, action, and resource
- where the active User is loaded and a soft-deleted caller becomes unauthenticated
- whether the module or the route loads a Job, Candidate, or Application needed for ownership checks and for distinguishing 403 from 404
- how list scopes such as `open_only`, `own`, `own_jobs`, and `own_apps` are represented
- how allow, 401, 403, and 404 outcomes are returned to the route layer

Keep permission rules in a code module. Do not introduce permission tables or implement the module in this ticket.
