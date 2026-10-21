---
title: What a valid session means after the user is soft-deleted
labels:
  - wayfinder:grilling
status: open
assignee:
parent: .scratch/authorization/map.md
blocked-by: []
---

## Question

A User can be soft-deleted while an Auth.js session for them still exists. ADR 0004 says to load the caller's role from the database, and to treat a soft-deleted resource as 404. It does not say what to do when the caller themselves is soft-deleted.

Decide the response on any route that requires a session, when the session token is valid and the User is soft-deleted.

Job reads are the awkward case: a missing session is an anonymous caller who may see open Jobs. Say whether a soft-deleted User on those two reads is treated as anonymous, 401, or 403.
