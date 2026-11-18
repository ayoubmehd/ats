---
title: Public open-Jobs board and Google sign-in
status: ready-for-agent
---

# Public open-Jobs board and Google sign-in

## Problem Statement

The ATS already stores Jobs and authenticates Users with Google, but the browser app is an empty shell. An anonymous caller cannot browse open Jobs. A User cannot start Google sign-in from the Astro origin. Recruiters, Candidates, admins, and Devs all hit a page that does not show hiring data.

The first product surface people expect from a hiring board — a public list of open Jobs and a page to read one — does not exist yet. Apply and the recruiter pipeline can wait; browsing open Jobs cannot.

## Solution

Ship a public open-Jobs board on the Astro origin, the same board for every caller (anonymous, Candidate, recruiter, admin, Dev).

- `/` lists open Jobs (title and summary).
- `/:id` shows one open Job (title, summary, content).
- `/signin` starts Google. After a session, every role lands on `/`.

The board is React islands inside a thin Astro shell. Islands fetch the existing Hono reads (`GET /jobs`, `GET /jobs/:id`) in the browser over the same-origin proxy. They keep only Jobs whose status is open. Chrome is a shared header with the product name and an always-on Sign in link. Loading, empty, missing, and failure states are explicit. Apply, recruiter pipeline UI, sign-out, and a custom visual theme stay out.

## User Stories

1. As an anonymous caller, I want to open the site at `/` and see open Jobs, so that I can browse hiring without creating a User.
2. As an anonymous caller, I want the list to show only Jobs whose status is open, so that I never see draft or closed Jobs.
3. As a recruiter, I want the same open-Jobs list as everyone else, so that extra rows `GET /jobs` returns for my session are not mixed into this board.
4. As an admin, I want the same open-Jobs list as everyone else, so that non-open Jobs I can read on the API are still hidden on this board.
5. As a Candidate, I want to browse open Jobs without applying yet, so that I can read the role before a later apply slice.
6. As a Dev, I want the same board as other callers, so that my role does not grow a separate hiring home.
7. As an anonymous caller, I want each list row to show the Job title, so that I can scan roles by name.
8. As an anonymous caller, I want each list row to show the Job summary, so that I can decide which Job to open.
9. As an anonymous caller, I want a list row with no usable summary to show **No summary**, so that a blank row is not mistaken for a loading error.
10. As an anonymous caller, I want to follow a list row to `/:id`, so that I can read that Job.
11. As an anonymous caller, I want the Job page to show title, then summary, then content, so that I can read the role in a stable order.
12. As an anonymous caller, I want missing summary on the Job page to show **No summary**, so that the page still has a complete layout.
13. As an anonymous caller, I want missing content on the Job page to show **No description**, so that an empty description is obvious.
14. As an anonymous caller, I want Job content rendered as plain text with newlines preserved, so that pasted descriptions stay readable and are not interpreted as Markdown or HTML.
15. As an anonymous caller, I do not want to see `status`, `posterId`, or a visible Job `id` on the list or Job page, so that internal fields stay off the board.
16. As an anonymous caller, I want **No open jobs** when the list has zero open Jobs, so that an empty board is not a blank page.
17. As an anonymous caller, I want a missing Job (`404`) to stay on `/:id` and say **Job not available**, so that I am not dumped onto a generic error or sent away from the URL I opened.
18. As an anonymous caller, I want a Job I am not allowed to read as open (`403`, or `200` whose status is not open) to use that same **Job not available** copy, so that draft and closed Jobs never leak fields.
19. As an anonymous caller, I do not want to see Hono JSON such as `Forbidden` or `Job not found`, so that API messages stay off the board.
20. As an anonymous caller, I want a skeleton on the list while `GET /jobs` is in flight, so that the page is visibly working.
21. As an anonymous caller, I want a skeleton on the Job page while `GET /jobs/:id` is in flight, so that the page is visibly working.
22. As an anonymous caller using a screen reader, I want the island marked busy and a visually hidden **Loading**, so that in-flight state is announced without a second visible “Loading…” label.
23. As an anonymous caller, I want **Couldn't load jobs** and a **Retry** button when the list fetch fails, so that I can recover from a network or server error.
24. As an anonymous caller, I want **Couldn't load this job** and a **Retry** button when the Job page fetch fails for reasons other than 403/404, so that a 5xx or malformed payload is distinct from “not available”.
25. As an anonymous caller, I want **Retry** to repeat that page’s GET and show the skeleton again while it runs, so that retry feels like the first load.
26. As an anonymous caller, I want a second failed retry to show the same failure copy again, so that I can keep trying.
27. As an anonymous caller, I want the shared header to stay visible during loading, empty, missing, and failure states, so that I can still reach home and Sign in.
28. As an anonymous caller, I want the product name in the header to take me to `/`, so that I can return to the list from a Job page.
29. As an anonymous caller, I want a Sign in control that always goes to `/signin`, so that I can start Google from either board page.
30. As a signed-in User, I still want Sign in visible, so that first slices do not imply a session-aware account menu.
31. As a User, I want `/signin` to start Google sign-in, so that I can get a database session from the Astro origin.
32. As a User, I want Google to return to `/auth/callback/google`, so that Auth.js can finish the session on the proxied `/auth` prefix.
33. As a User, I want a successful Google sign-in to land me on `/`, so that every role shares one post-login destination.
34. As an admin, I want to land on the open-Jobs list after Google, so that I do not get a separate admin home in this slice.
35. As a recruiter, I want to land on the open-Jobs list after Google, so that I do not get a pipeline home in this slice.
36. As a Candidate, I want to land on the open-Jobs list after Google, so that I do not get an apply home in this slice.
37. As a Dev, I want to land on the open-Jobs list after Google, so that I do not get a tools home in this slice.
38. As a signed-in User, I want opening `/signin` to send me to `/`, so that I am not asked to start Google again.
39. As a User, I want `/signin` to use the Auth.js CSRF token when it POSTs to `/auth/signin/google`, so that sign-in follows the existing auth handler.
40. As a new User signing in with Google for the first time, I want my role to stay the existing default (`candidate`), so that this slice does not change how roles are assigned.
41. As an anonymous caller, I want `/signin` to remain a dedicated page (not captured by `/:id`), so that Sign in is not treated as a Job id.
42. As an anonymous caller, I want favicon and other static files to keep working, so that `/:id` does not steal them.
43. As an anonymous caller, I want list and Job pages to stay static shells whose islands fetch in the browser, so that first slices do not take an SSR dependency.
44. As an anonymous caller, I want board fetches to use same-origin `/jobs` and `/jobs/:id`, so that host-only session cookies work without CORS.
45. As a signed-in User, I want those same same-origin fetches, so that my session cookie is sent and the island still hides non-open Jobs in the UI.
46. As an anonymous caller, I want the board to look like shadcn defaults on Tailwind, so that first slices do not invent a custom theme.
47. As an anonymous caller, I do not want an Apply control on the list or Job page, so that apply is a later slice.
48. As a recruiter, I do not want pipeline navigation in this chrome, so that this effort stays list-and-read.
49. As a User, I do not want sign-out in this chrome, so that session end stays a later slice.
50. As an anonymous caller, I do not want an extra back link on the Job page, so that the header product name is the way home.
51. As a Candidate, I want to read an open Job while signed in the same way I did anonymously, so that sign-in does not change the board.
52. As an anonymous caller, I want Retry on the list not to invent rows, so that a recovered empty list still shows **No open jobs**.
53. As an anonymous caller, I want a Job page Retry that then gets 403/404 to switch to **Job not available**, so that a later “not available” is not stuck on the failure copy.
54. As an anonymous caller, I want whitespace-only summary and content treated as missing, so that a blank string does not pass as real copy.
55. As an anonymous caller, I want list skeletons to suggest three rows (title bar then summary bar), so that loading matches the list layout.
56. As an anonymous caller, I want the Job page skeleton to suggest title, summary, then a taller content block, so that loading matches the Job layout.
57. As an anonymous caller, I want failure copy to stay plain text plus a default **Retry** button, so that errors are not wrapped in Alert.
58. As a User, I want `/signin` to skip the board header, so that the sign-in page is only the start-Google island.
59. As a User, I want Hono’s built-in Auth.js HTML sign-in page not to be a second start, so that `/signin` is the only start.
60. As an implementer of later slices, I want a frontend testing ADR on disk, so that island tests have a locked strategy instead of ADR 0002’s deferral.

## Implementation Decisions

- First UI slices live in the existing web package (Astro shell, React islands, Tailwind, same-origin proxy). Do not reopen ADR 0005.
- Copy shadcn/ui components into the web package (repo-local copy). Use them only inside React islands. Astro pages and layouts stay a thin shell: document, layout, island mount. Do not restyle the board in Astro with a parallel utility-class UI.
- Keep shadcn init defaults (including its icon set). Do not pick colors, radius, dark mode, or a custom theme.
- Pages for this effort:
  - Open-Jobs list: `/`
  - Job page: `/:id` where `id` is numeric `Job.id`
  - Sign-in: `/signin` (static Astro page; wins over `/:id`)
- Do not put Astro pages under `/jobs`, `/auth`, `/candidates`, or `/applications`. Those prefixes stay the Vite/production proxy to Hono.
- Shared header on `/` and `/:id` only: product name links to `/`; Sign in links to `/signin` and is always shown (not session-aware). List rows link to `/:id`. No extra back link, no sign-out, no role nav. `/signin` does not use this header.
- `/` and `/:id` stay static (do not set `prerender = false`). Each mounts a shadcn React island.
- The list island fetches `GET /jobs` in the browser. The Job page island receives the route `id` as a prop and fetches `GET /jobs/:id` in the browser. Do not SSR-load those routes on the Astro server. Do not add Astro endpoints that duplicate Hono.
- After fetch, the list island keeps only Jobs with `status === "open"`. Extra rows a recruiter or admin session would receive are not shown. Do not add a Hono query for this.
- Job JSON shape is unchanged: `id`, `title`, `summary`, `content`, `status`, `posterId`. Changing the Hono API is out of scope.
- List UI fields: title, summary. Job page UI fields: title, then summary, then content. Never show `status`, `posterId`, or a visible `id` (id stays in the URL and list href only).
- Null, empty, or whitespace-only `summary` → **No summary** on both pages. Same for `content` on the Job page → **No description**.
- Render `content` as plain text; preserve newlines. Do not render Markdown or HTML.
- Empty list (zero open Jobs after filtering): **No open jobs**. No fake table chrome. Header stays.
- Job page `404`, `403`, and `200` with status not open: stay on `/:id`, body **Job not available**. Do not show Hono message bodies. Never render draft or closed fields.
- In-flight GET: shadcn Skeleton (defaults, including pulse). List: 3 rows, title bar then summary bar each. Job page: title bar, summary bar, taller content block. Island is `aria-busy` and includes visually hidden **Loading** (`sr-only`). No second visible “Loading…”. Header stays.
- Fetch failure (network error, 5xx, 400, malformed or non-Job JSON, or any other non-OK that is not Job-page 403/404): plain text plus default shadcn **Button** **Retry**. List: **Couldn't load jobs**. Job page: **Couldn't load this job**. No Alert. Retry repeats that page’s same GET; while in flight, replace the failure body with the same skeleton. A later 403/404 (or not-open 200) on the Job page uses **Job not available**, not the failure copy.
- `/signin` is a thin Astro shell plus a shadcn React island (no board header). The island:
  1. `GET /auth/session`. If a User is present, navigate to `/`.
  2. Otherwise `GET /auth/csrf`, then POST to `/auth/signin/google` with that CSRF token and `callbackUrl` `/`.
- Set Auth.js `pages.signIn` to `/signin` so the built-in Hono HTML is not a second start. This is auth config only; do not add or change hiring routes or Job schemas.
- After Google, `callbackUrl` is `/` for every role. Do not change first-Google role assignment.
- Write ADR 0006 (next number after 0005): component tests at React island seams; Vitest + React Testing Library in the web package; E2E still deferred. Do not change ADR 0002’s server-first rule.
- Browser calls stay same-origin paths. Sessions stay Auth.js HTTP-only cookies (ADR 0003). No JWT in `localStorage`. No credentialed CORS for v1.

## Testing Decisions

- A good test asserts what the island shows and which same-origin request it made. It does not assert React state, effect wiring, or shadcn internals.
- Seam (confirmed): the three React islands — open-Jobs list, Job page, sign-in — rendered with Vitest + Testing Library. Stub `fetch` so tests return Hono JSON (or fail the request) without hitting Hono or the proxy.
- Do not add Playwright or other E2E against the Astro origin in this effort.
- Do not test Astro page shells, the Vite proxy, or copied shadcn primitives.
- Do not re-test Hono Job reads, 401/403/404, or Auth.js session routes; those stay server tests (ADR 0002, existing jobs and auth route tests).
- List island tests (stub `GET /jobs`): mixed-status payload shows only open Jobs; title and summary; **No summary**; **No open jobs**; skeleton + `aria-busy` + sr-only **Loading**; **Couldn't load jobs** + **Retry**; Retry repeats `GET /jobs` and shows skeleton then success or the same failure; recovered empty list still **No open jobs**; `status` / `posterId` / visible `id` absent.
- Job page island tests (pass `id`, stub `GET /jobs/:id`): field order; placeholders; plain-text content with newlines; **Job not available** for 404, 403, and 200 not-open; Hono JSON bodies not shown; failure copy for 5xx/network/malformed JSON; Retry; Retry that then 404 becomes **Job not available**.
- Sign-in island tests (stub `GET /auth/session`, `GET /auth/csrf`, and the Google start): no session → CSRF fetch then POST `/auth/signin/google` with token and `callbackUrl` `/`; session present → navigate to `/`. If the Google start is a form POST, assert action, method, and fields instead of following a redirect. Do not drive Google.
- Prior art: server package uses Vitest against Hono routers with a real test database. There is no frontend test runner yet; ADR 0006 and the web package runner are part of this effort. Match Vitest as the runner; do not copy the database helper into web tests.

## Out of Scope

- Changing the Hono hiring API (new queries, schema fields, or status codes).
- Application create UI (apply).
- Recruiter pipeline UI and per-role homes.
- Sign-out, session-aware header, or account menu.
- Custom visual theme (colors, radius, dark mode).
- End-to-end browser tests against the Astro origin.
- Mobile apps.
- Changing first-Google role assignment.
- Product UI that was deferred in the factory setup pass beyond this board and `/signin`.

## Further Notes

- Domain terms: User, Dev, Candidate, Job, Application, soft delete (`CONTEXT.md`). Do not say applicant, opening, requisition, submission, or archive.
- Read before implementing: `CONTEXT.md`, ADR 0003 (auth), ADR 0004 (authorization, public open Job reads), ADR 0005 (Astro/React/proxy), and this PRD. Write ADR 0006 as specified above.
- Source of locked product decisions: `.scratch/frontend/map.md` and its closed tickets. This PRD does not reopen them.
- Web-dev `AUTH_URL` is the Astro origin; Google redirect URI includes `http://localhost:4321/auth/callback/google`. Server tests keep `AUTH_URL=http://localhost:3000/auth`.
- The `.cursor/rules/frontend-astro-react.mdc` line that forbids product screens until the frontend map is empty is already satisfied (map `status: closed`).
