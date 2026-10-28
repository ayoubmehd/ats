---
title: What a valid session means after the user is soft-deleted
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/authorization/map.md
blocked-by: []
---

## Question

A User can be soft-deleted while an Auth.js session for them still exists. ADR 0004 says to load the caller's role from the database, and to treat a soft-deleted resource as 404. It does not say what to do when the caller themselves is soft-deleted.

Decide the response on any route that requires a session, when the session token is valid and the User is soft-deleted.

Job reads are the awkward case: a missing session is an anonymous caller who may see open Jobs. Say whether a soft-deleted User on those two reads is treated as anonymous, 401, or 403.

## Resolution

A session token linked to a soft-deleted User does not establish an active identity.

- On any route that requires a session, return 401. Authorization does not receive a caller, so this is not a role or ownership failure.
- On `GET /jobs` and `GET /jobs/:id`, discard the inactive identity and apply the anonymous `open_only` scope. The stale cookie does not prevent access to public Jobs.

The response body for the 401 remains with [What 401 and 403 responses look like](05-401-and-403-response-shape.md).
