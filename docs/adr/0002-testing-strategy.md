---
status: accepted
---

# Server-first testing strategy with grill-with-docs design review

We adopt a server-first testing strategy for the ATS. Current priority is validating
route behavior and database-backed flows for Users, Jobs, and Applications using a
dedicated test database. Integration tests are the default for critical behaviors;
no unit tests added for now.

Before expanding or changing test scope, we run a `grill-with-docs` review to sharpen
domain language, stress-test edge cases, and confirm boundaries. This is a
decision-quality process step, not a runtime testing framework.

Frontend and end-to-end browser testing are deferred to a follow-up ADR once server
coverage and test execution reliability are stable.

## Considered Options

- Full-stack testing strategy now (server + frontend + E2E) - rejected for now; scope
  is too broad for the current system maturity and would slow feedback on server risks.
- Unit-test-heavy approach - rejected as the primary strategy; route and persistence
  behavior is central and better validated through integration coverage.
- Implicit ad-hoc design review before test changes - rejected; an explicit
  `grill-with-docs` step creates clearer, repeatable decision records.

## Consequences

- Route and DB-backed behavior become the first-class testing target.
- Test work should prioritize high-risk server paths and data integrity rules before
  frontend automation.
- Significant additions to testing scope should be pressure-tested with
  `grill-with-docs` before implementation details are finalized.
- A follow-up ADR is required to define frontend and E2E strategy.
