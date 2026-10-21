---
title: Which applications stay visible across job status and soft delete
labels:
  - wayfinder:grilling
status: open
assignee:
parent: .scratch/authorization/map.md
blocked-by: []
---

## Question

`GET /applications` is scoped by role: an admin sees all, a recruiter sees Applications to Jobs they posted, a Candidate sees their own. The matrix does not say what happens when the related Job is closed, draft, or soft-deleted.

The current list drops Applications whose Job is soft-deleted, and it still returns Applications for Jobs in any other status.

Decide, for an admin, a recruiter, and a Candidate, whether the list includes an Application when its Job is closed, draft, or soft-deleted.

Decide the same for `POST /applications/:id/next-stage` and `POST /applications/:id/reject`: when the Application exists but its Job is closed, draft, or soft-deleted, is the action allowed, 403, or 404?

Pipeline transition rules are out of scope. This ticket is only visibility, and whether those two actions can see the Application.
