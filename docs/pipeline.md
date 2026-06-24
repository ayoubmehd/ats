# Pipeline Stage Transitions

Valid transitions for the ATS hiring pipeline:

```
applied -> screening -> interview -> offer -> hired
   |           |            |          |
   v           v            v          v
rejected   rejected     rejected   rejected
```

## Rules

- Every application starts at `applied`.
- Each stage can only move forward to the next stage, or sideways to `rejected`.
- `hired` and `rejected` are terminal states (no further transitions).
- The API enforces these rules in `src/routes/applications.ts` by:
  - `/next-stage` checking current stage from db and moving to the correct stage.
  - `/reject` reject application.