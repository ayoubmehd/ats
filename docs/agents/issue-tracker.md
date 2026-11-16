# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue file, or as YAML front matter `status:` (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Wayfinder maps and tickets use the same `.scratch/<feature-slug>/` tree. Match the authorization map: `.scratch/authorization/map.md`.

- The **map** is `.scratch/<feature-slug>/map.md`. Front matter includes `title`, `labels: [wayfinder:map]`, and `status` (`open` or `closed`).
- A **ticket** is `.scratch/<feature-slug>/issues/<NN>-<slug>.md`. It is a child of the map when its front matter `parent` is the map path (for example `.scratch/authorization/map.md`).
- Ticket front matter:
  - `title` — the ticket name; refer to tickets by this name, not by filename alone
  - `labels` — one of `wayfinder:grilling`, `wayfinder:research`, `wayfinder:prototype`, `wayfinder:task`
  - `status` — `open` or `closed`
  - `assignee` — omit or leave empty until claimed; claim by setting it before any work
  - `parent` — path to the map file
  - `blocked-by` — list of sibling ticket paths; `[]` means unblocked
- A ticket is **unblocked** when every `blocked-by` entry is `status: closed`. An empty list is unblocked.
- The **frontier** is the open, unblocked, unclaimed children, in filename order.
- On resolution: write a `## Resolution` section on the ticket, set `status: closed`, and append one gist line to the map's **Decisions so far**.
