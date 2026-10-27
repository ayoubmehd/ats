---
title: Which route tests prove the authorization matrix
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
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

## Resolution

Route tests against the test database, as ADR 0002 sets them. No unit tests of `decide`.

Each router proves every distinct outcome once, on a representative route. List and read, PUT and DELETE, or advance and reject share one case only when the locked decision gives them the same status. Every allow scope gets its own list case, which asserts which fixture rows are present and which are absent.

The matrix lists only what the current tests do not already prove. Passing tests stay unless a case below replaces them. Pipeline rules, and applying to a Job that is not open, are outside this map.

Each router asserts the full body once for each status it adds: 401 `{ message: "Unauthorized" }` and 403 `{ message: "Forbidden" }`. Other cases with those statuses assert only the status. Every 404 asserts its `{ message }`.

A "soft-deleted caller" is a User with `deletedAt` set and a valid session cookie. "Unchanged" means the test reads the row back after the response.

### Jobs

| Case | Caller | Route and fixture | Expect |
|------|--------|-------------------|--------|
| J1 | anonymous | `GET /jobs`. Open, closed, draft, and soft-deleted open Jobs exist | 200. Contains the open Job. The closed, draft, and soft-deleted Jobs are absent |
| J2 | soft-deleted recruiter | `GET /jobs`. That recruiter posted a draft Job | 200. Their draft Job is absent, so the scope is anonymous `open_only` |
| J3 | recruiter | `GET /jobs`. Own draft and own closed Job. Another recruiter's open and draft Job. A soft-deleted Job | 200. Contains own draft, own closed, and the other recruiter's open Job. The other recruiter's draft and the soft-deleted Job are absent |
| J4 | admin | `GET /jobs`. Another recruiter's draft and closed Job. A soft-deleted Job | 200. Contains the draft and closed Jobs. The soft-deleted Job is absent |
| J5 | anonymous | `GET /jobs/:id` on a draft Job | 403, body asserted |
| J6 | recruiter | `GET /jobs/:id` on another recruiter's draft Job | 403 |
| J7 | anonymous | `DELETE /jobs/999999` (no such Job) | 401, body asserted. Unauthenticated comes before not_found |
| J8 | soft-deleted recruiter | `POST /jobs` | 401. No Job inserted |
| J9 | Candidate | `PUT /jobs/999999` (no such Job) | 403. Role denial comes before not_found |
| J10 | recruiter | `PUT /jobs/:id` on another recruiter's Job | 403. That Job unchanged |
| J11 | admin | `PUT /jobs/:id` on another recruiter's Job | 200. Updated fields returned |
| J12 | recruiter | `POST /jobs` with a body `posterId` of another recruiter | 201. `posterId` is the caller |

J1 replaces `protected routes return 401 without auth` in `auth.test.ts`. That test is removed, not rewritten to a second anonymous case.

### Candidates

| Case | Caller | Route and fixture | Expect |
|------|--------|-------------------|--------|
| C1 | anonymous | `GET /candidates` | 401, body asserted |
| C2 | soft-deleted admin | `GET /candidates` | 401 |
| C3 | Candidate | `GET /candidates/:id` with an id that has no User | 403, body asserted. Role denial comes before not_found |
| C4 | recruiter | `PUT /candidates/:id` on a live Candidate | 403. That Candidate unchanged |
| C5 | recruiter | `GET /candidates`. A live Candidate, a recruiter, an admin, and a soft-deleted Candidate | 200. Contains only the live Candidate |
| C6 | recruiter | `GET /candidates/:id` on a live recruiter | 404 `{ message: "Candidate not found" }` |
| C7 | admin | `DELETE /candidates/:id` on a live recruiter | 404 `{ message: "Candidate not found" }`. Recruiter `deletedAt` stays null |
| C8 | admin | `POST /candidates` with the email of a soft-deleted Candidate | 201 `{ id, name, email }`. `id` is the old id, `name` is from the body, `deletedAt` is cleared, and there is no new row |
| C9 | admin | `POST /candidates` with the email of a soft-deleted recruiter | 400 `{ error: "Candidate already exists" }`. The recruiter stays soft-deleted and there is no new row |
| C10 | admin | `PUT /candidates/:id` on a live Candidate with another User's email | 400 `{ error: "Candidate already exists" }`. That Candidate unchanged |
| C11 | admin | `PUT /candidates/:id` on a live Candidate with their own current email | 200 |

The existing `create candidate`, `update candidate`, `delete candidate`, and `get deleted candidate` tests sign in as an admin instead of a recruiter. That makes them the admin create, update, and delete proofs. `get candidates` and `get candidate` keep the recruiter cookie.

### Applications

| Case | Caller | Route and fixture | Expect |
|------|--------|-------------------|--------|
| A1 | Candidate | `GET /applications`. Their Application on another recruiter's Job, another Candidate's Application, and their Application on a soft-deleted Job | 200. Contains only their Application on the live Job |
| A2 | admin | `GET /applications`. Applications on two recruiters' Jobs, one on a closed Job, and one on a soft-deleted Job | 200. Contains all of them |
| A3 | recruiter | `GET /applications`. An Application on their own closed Job and one on their own draft Job | 200. Contains both |
| A4 | recruiter | `POST /applications/:id/next-stage` on an Application to another recruiter's Job | 403, body asserted. Status unchanged |
| A5 | Candidate | `POST /applications/:id/reject` on their own Application | 403. Status unchanged |
| A6 | recruiter | `POST /applications/:id/next-stage` on an Application to their own soft-deleted Job | 404 `{ message: "Application not found" }`. Status unchanged |
| A7 | admin | `POST /applications/:id/next-stage` on an Application to a soft-deleted Job | 200. Status advanced |
| A8 | recruiter | `POST /applications/:id/next-stage` on an Application to their own closed Job | 200. Status advanced |
| A9 | admin | `POST /applications` to an open Job | 403. No Application inserted |
| A10 | Candidate | `POST /applications` to a soft-deleted Job | 404 `{ message: "Job not found" }` |
| A11 | soft-deleted Candidate | `GET /applications` | 401 |

The existing `get applications unauthenticated` test also asserts 401 `{ message: "Unauthorized" }`. `create application unauthenticated` stays status-only.

### Fixtures

The cases need an admin User, a second recruiter, soft-deleted Users of each role named above, and a soft-deleted Candidate whose email is free to reuse. No current test signs in as an admin.
