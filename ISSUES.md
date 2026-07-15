# Code Review: Issues Report

Generated: 2026-07-08

## Critical

- [No authentication or authorization on any endpoint](https://github.com/ayoubmehd/ats/issues/1)
- [Database credentials committed to version control](https://github.com/ayoubmehd/ats/issues/2)
- [Hardcoded default database credentials in application code](https://github.com/ayoubmehd/ats/issues/3)

## High

- [Update candidate crashes on missing or soft-deleted ID](https://github.com/ayoubmehd/ats/issues/4)
- [Candidates API does not scope to role = 'candidate'](https://github.com/ayoubmehd/ats/issues/5)
- [Validate inputs at the route layer instead of catching DB errors globally](https://github.com/ayoubmehd/ats/issues/6)
- [next-stage allows transitions from terminal rejected state](https://github.com/ayoubmehd/ats/issues/7)
- Create application lacks job validation *(folded into [#6](https://github.com/ayoubmehd/ats/issues/6))*
- [Test suite lacks isolated fixtures — parallel runs conflict on shared seed data](https://github.com/ayoubmehd/ats/issues/8)
- Update candidate has no email uniqueness check *(folded into [#6](https://github.com/ayoubmehd/ats/issues/6))*

## Medium

- [Delete candidate always returns 200, even when nothing was deleted](https://github.com/ayoubmehd/ats/issues/9)
- [Create candidate treats soft-deleted emails as already exists](https://github.com/ayoubmehd/ats/issues/10)
- [GET /applications includes applications for soft-deleted jobs](https://github.com/ayoubmehd/ats/issues/11)
- [updatedAt is never updated on writes](https://github.com/ayoubmehd/ats/issues/12)
- Race condition on duplicate checks (TOCTOU) *(skipped — deferred)*
- [ats_test database missing from Docker setup](https://github.com/ayoubmehd/ats/issues/13)
- Destructive tests mutate seed data without restoration *(folded into [#8](https://github.com/ayoubmehd/ats/issues/8))*
- Create application does not handle duplicate gracefully *(folded into [#6](https://github.com/ayoubmehd/ats/issues/6))*
- `posterId` foreign key not validated on job create/update *(folded into [#6](https://github.com/ayoubmehd/ats/issues/6))*

## Low

- [POST /applications returns HTTP 200 instead of 201](https://github.com/ayoubmehd/ats/issues/14)
- [Create application response omits status](https://github.com/ayoubmehd/ats/issues/15)
- Hardcoded fallback candidate email in production path *(covered by [#1](https://github.com/ayoubmehd/ats/issues/1))*
- [No input size limits on resume / resumeText](https://github.com/ayoubmehd/ats/issues/16)
- [API docs and health endpoints publicly exposed](https://github.com/ayoubmehd/ats/issues/17)
- [Dead duplicate null-check in next-stage handler](https://github.com/ayoubmehd/ats/issues/18)
- [Test files hold pool connections without releasing](https://github.com/ayoubmehd/ats/issues/19)
- [posterId hardcoded to null in several application responses](https://github.com/ayoubmehd/ats/issues/20)
- [OpenAPI CandidateSchema.id example is a string](https://github.com/ayoubmehd/ats/issues/21)

## Architecture Debt

- [Implement shared query helpers with soft-delete filters (ADR 0001)](https://github.com/ayoubmehd/ats/issues/22)
- [ats_test database missing from Docker setup](https://github.com/ayoubmehd/ats/issues/13)
