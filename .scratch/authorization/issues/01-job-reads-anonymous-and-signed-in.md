---
title: How job reads tell anonymous callers from signed-in roles
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/authorization/map.md
blocked-by: []
---

## Question

`GET /jobs` and `GET /jobs/:id` allow a caller with no session, and only for a Job whose status is open. Every other route requires a session. Today `verifyAuth()` is mounted on the whole jobs router, and it rejects a missing session with 401.

Decide how those two reads accept an anonymous caller while every other route still requires a session. Name the mechanism an implementer should use.

Do not reopen the permission matrix. Anonymous and Candidate see open Jobs. A recruiter also sees their own Jobs in any status. An admin sees every Job. A missing or soft-deleted Job is 404. An existing Job outside the caller's scope is 403.

## Resolution

Keep a single jobs router. Remove its blanket `verifyAuth()`.

`optionalAuth` runs only on `GET /jobs` and `GET /jobs/:id`. It calls `getAuthUser`. When that returns a session, store it with `c.set("authUser", authUser)`, the same context key `verifyAuth` uses. When it returns null (missing cookie, invalid cookie, or expired session), do not 401 and do not invent a caller. Leave `authUser` unset. There is no anonymous User and no anonymous role value.

Every other jobs route still uses `verifyAuth()`, which 401s on that same null. The candidates and applications routers stay on blanket `verifyAuth()`.

`optionalAuth` only answers whether a caller is present. Open-only, ownership, and admin visibility stay in the permission module.

A valid session whose User is soft-deleted is still stored as `authUser`. What that caller may do is [What a valid session means after the user is soft-deleted](04-session-after-user-soft-deleted.md).

The existing auth test that expects `GET /jobs` with no cookie to return 401 will no longer match. [Which route tests prove the authorization matrix](08-authorization-route-test-matrix.md) removes it and decides the cases that replace it.
