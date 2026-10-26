---
title: What interface the authorization module exposes
labels:
  - wayfinder:prototype
status: closed
assignee: ayoub
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

## Prototype

Throwaway walkthrough of the locked shape: [Authorization module interface prototype](../prototype-module-interface.html). Open the file in a browser. It is not the implementation.

## Resolution

Two functions, in one module. No permission tables. `decide` does not query and does not write HTTP.

`resolveCaller` loads the User for the session user id. It runs after `optionalAuth` or `verifyAuth`. Those still store `authUser` as [How job reads tell anonymous callers from signed-in roles](01-job-reads-anonymous-and-signed-in.md) decided, including when that User is soft-deleted. A missing session, a missing User, or a soft-deleted User becomes an anonymous caller. `decide` never receives a soft-deleted User.

The handler then loads the subject and calls `decide(caller, request)`.

The route passes:

- a list or a create: no row
- a Job read, update, or delete: the Job by id, including a soft-deleted Job, or null when no row exists
- a Candidate read, update, or delete: the User by id, with no role filter, including a soft-deleted User, or null
- an apply: the Job by id, including a soft-deleted Job, or null
- an advance or reject: the Application by id, including a soft-deleted Application, or null, and the Job it belongs to, including a soft-deleted Job

The request names a resource (`job`, `candidate`, `application`) and an action (`list`, `read`, `create`, `update`, `delete`, `apply`, `advance`, `reject`) for a combination the routes already have.

`decide` returns one of:

- `allow`, with a list scope or a poster source when that action needs one
- `unauthenticated`
- `forbidden`
- `not_found`, with `message` of `Job not found`, `Candidate not found`, or `Application not found`

The route writes the response. `unauthenticated` is 401 `{ message: "Unauthorized" }`. `forbidden` is 403 `{ message: "Forbidden" }`. `not_found` is 404 `{ message }` using the message on the decision. `allow` means the handler continues. Those two fixed bodies are [What 401 and 403 responses look like](05-401-and-403-response-shape.md).

Check order:

1. A protected action with an anonymous caller is `unauthenticated`, including when the row is missing.
2. A role that cannot perform the action at all is `forbidden`, including when the row is missing or soft-deleted.
3. When that role can perform the action on some row, `not_found` covers a missing row, a soft-deleted subject, a User who is not a Candidate on a Candidate route, and a recruiter advance or reject whose Job is soft-deleted.
4. A row outside ownership or open scope is `forbidden`.
5. Otherwise `allow`.

Job reads stay public. An anonymous caller is in scope there. A Candidate can read Jobs, so a missing or soft-deleted Job on read is `not_found`, and a closed or draft Job outside scope is `forbidden`.

A list `allow` carries a scope tag. The route writes the query for that tag.

- Jobs `open_only`: open Jobs that are not soft-deleted. Anonymous and Candidate.
- Jobs `own_and_open`, with `posterId`: that recruiter's Jobs in any status, plus every other open Job. Soft-deleted Jobs are excluded.
- Jobs `global`: every Job that is not soft-deleted. Admin.
- Candidates `global`: live Users whose role is candidate. Admin and recruiter share it.
- Applications `global`: every Application, including those whose Job is soft-deleted. Admin. Job status does not narrow it.
- Applications `own_jobs`, with `posterId`: Applications to Jobs that recruiter posted, excluding soft-deleted Jobs. Job status does not narrow it.
- Applications `own_apps`, with `candidateId`: that Candidate's Applications, excluding soft-deleted Jobs. Job status does not narrow it.

Creating a Job: a recruiter's `allow` takes `posterId` from the caller, and a body value is ignored. An admin's `allow` takes `posterId` from the body. Other allows carry no poster source. Changing `posterId` on update stays out of this map.

Applying: a Candidate, and a Job that exists and is not soft-deleted, is `allow`, including when that Job is closed or draft. The route still rejects a Job that is not open. That status stays out of this map. A missing or soft-deleted Job is `not_found` with `Job not found`.

Advance and reject: an admin `allow` includes an Application whose Job is soft-deleted, closed, or draft. A recruiter whose Job is soft-deleted gets `not_found` with `Application not found`, including when they posted it. A Candidate is `forbidden`. Pipeline rules stay in the route.

An admin Candidate update or delete that returns `not_found` does not write. The User stays unchanged. Email collisions stay in the route.
