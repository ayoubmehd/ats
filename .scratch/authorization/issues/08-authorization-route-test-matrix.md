---
title: Which route tests prove the authorization matrix
labels:
  - wayfinder:grilling
status: open
assignee:
parent: .scratch/authorization/map.md
blocked-by:
  - 05-401-and-403-response-shape.md
  - 06-admin-write-when-user-is-not-a-candidate.md
  - 07-authorization-module-interface.md
---

## Question

Define the smallest route-test matrix that proves the locked ADR 0004 decisions without duplicating equivalent cases.

Cover session cookies for anonymous, admin, recruiter, and Candidate callers; role and ownership denials; missing and soft-deleted resources; a soft-deleted caller; Job and Application visibility; and admin writes through Candidate routes.

For each required case, identify the route, fixture relationship, expected status, and response shape. Respect ADR 0002's test-scope boundary. This ticket decides the cases; it does not implement them.
