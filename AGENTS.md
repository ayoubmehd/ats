# ATS

## How we build

Read `CONTEXT.md` and the relevant ADRs in `docs/adr/` before changing code. Do not invent synonyms the glossary avoids.

Work proceeds in this order:

1. Wayfinder or grill until the map is empty and decisions are locked in ADRs (and `CONTEXT.md` when terms change).
2. `/to-prd` then `/to-issues` for AFK-ready vertical slices under `.scratch/`.
3. `/implement` with `/tdd` at the agreed seams.
4. `/review`.

Implementation does not start while wayfinder tickets for that effort remain open.

## Agent skills

### Issue tracker

Issues and PRDs live as local markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default role strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root and ADRs in `docs/adr/`. See `docs/agents/domain.md`.
