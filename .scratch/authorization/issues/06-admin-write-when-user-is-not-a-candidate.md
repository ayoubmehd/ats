---
title: What an admin write does when the user is not a candidate
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/authorization/map.md
blocked-by:
  - 02-which-users-candidate-list-returns.md
---

## Question

Admin `PUT /candidates/:id` and `DELETE /candidates/:id` are allowed by ADR 0004. [Which users a candidate list returns](02-which-users-candidate-list-returns.md) says a successful read returns only Users with role candidate, and a recruiter or admin id is 404.

The handlers today update or soft-delete any non-deleted User, with no role check. `POST /candidates` inserts name and email only; the users table defaults `role` to candidate. A duplicate email, including one that already belongs to a recruiter or admin, returns 400.

Decide what `PUT` and `DELETE` do when the id exists, is not soft-deleted, and the role is recruiter or admin.

Decide what `POST /candidates` does when that email already belongs to a recruiter or admin.

## Resolution

`PUT /candidates/:id` and `DELETE /candidates/:id` for a live User whose role is `recruiter` or `admin` return 404 `{ message: "Candidate not found" }` and leave that User unchanged. That is the same response as a missing id or a soft-deleted User.

`POST /candidates` keeps one User per email. A soft-deleted Candidate with that email is restored: clear `deletedAt`, set `name` from the body, leave the id and role, and return 201 `{ id, name, email }`. Applications that already point at that id stay on it.

A live Candidate, or an email owned by a recruiter or admin whether that User is live or soft-deleted, returns 400 `{ error: "Candidate already exists" }`. Nothing is inserted or restored.

`PUT /candidates/:id` on a live Candidate returns that same 400 when any other User row already has the new email, and leaves this Candidate unchanged. A PUT whose email is the one this Candidate already has still succeeds.
