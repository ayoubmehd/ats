---
title: Which applications stay visible across job status and soft delete
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/authorization/map.md
blocked-by: []
---

## Question

`GET /applications` is scoped by role: an admin sees all, a recruiter sees Applications to Jobs they posted, a Candidate sees their own. The matrix does not say what happens when the related Job is closed, draft, or soft-deleted.

The current list drops Applications whose Job is soft-deleted, and it still returns Applications for Jobs in any other status.

Decide, for an admin, a recruiter, and a Candidate, whether the list includes an Application when its Job is closed, draft, or soft-deleted.

Decide the same for `POST /applications/:id/next-stage` and `POST /applications/:id/reject`: when the Application exists but its Job is closed, draft, or soft-deleted, is the action allowed, 403, or 404?

Pipeline transition rules are out of scope. This ticket is only visibility, and whether those two actions can see the Application.

## Resolution

`GET /applications` keeps the role scope ADR 0004 already states: an admin sees all, a recruiter sees Applications to Jobs they posted, a Candidate sees their own. Job status does not narrow that set. An Application whose Job is open, closed, or draft stays in the list for every role that already has scope.

When the Job is soft-deleted, only an admin still receives that Application. A recruiter and a Candidate do not.

`POST /applications/:id/next-stage` and `POST /applications/:id/reject`, when the Application itself is present and not soft-deleted:

- A closed or draft Job stays actionable. An admin may act on any Application. A recruiter may act on Applications to Jobs they posted. Pipeline rules stay as they are: already hired or rejected returns 400.
- A soft-deleted Job stays actionable for an admin, who may still next-stage and reject. A recruiter receives 404 on both actions, whether or not they posted the Job.
- A Candidate has no access to those two routes. That response stays 403. Job state does not grant the actions. The body of that 403 is [What 401 and 403 responses look like](05-401-and-403-response-shape.md).
