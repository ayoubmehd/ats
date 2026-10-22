---
title: What an admin write does when the user is not a candidate
labels:
  - wayfinder:grilling
status: open
assignee:
parent: .scratch/authorization/map.md
blocked-by:
  - 02-which-users-candidate-list-returns.md
---

## Question

Admin `PUT /candidates/:id` and `DELETE /candidates/:id` are allowed by ADR 0004. [Which users a candidate list returns](02-which-users-candidate-list-returns.md) says a successful read returns only Users with role candidate, and a recruiter or admin id is 404.

The handlers today update or soft-delete any non-deleted User, with no role check. `POST /candidates` inserts name and email only; the users table defaults `role` to candidate. A duplicate email, including one that already belongs to a recruiter or admin, returns 400.

Decide what `PUT` and `DELETE` do when the id exists, is not soft-deleted, and the role is recruiter or admin.

Decide what `POST /candidates` does when that email already belongs to a recruiter or admin.
