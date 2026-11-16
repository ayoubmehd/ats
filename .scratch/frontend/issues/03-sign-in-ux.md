---
title: Sign-in UX after Google
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/frontend/map.md
blocked-by: []
---

## Question

Auth.js with Google and database sessions is already on Hono (ADR 0003). The browser origin is Astro; `/auth` is proxied (ADR 0005). There is no login UI yet.

Decide:

- Where the User starts Google sign-in (which path on the Astro origin)
- Where Google returns them
- Where each role lands after a successful session: admin, recruiter, candidate, dev

Anonymous Users may still read open Jobs; that stays as ADR 0004. Do not change how roles are assigned on first Google sign-in.

Do not pick the first hiring surface here; that is [Which product surface is first](01-which-product-surface-is-first.md).

## Resolution

The User starts Google sign-in on Astro **`/signin`**. That page is a thin Astro shell plus a shadcn React island (same split as [Visual system on top of Tailwind](02-visual-system.md)). The island POSTs to `/auth/signin/google` with the Auth.js CSRF token from `GET /auth/csrf`.

Google returns to **`/auth/callback/google`** (ADR 0005). Set Auth.js `pages.signIn` to `/signin` so the built-in Hono HTML is not a second start.

After a successful session, **admin, recruiter, candidate, and dev all land on the open-Jobs list page**. That list path is [Navigation and information architecture for the board](06-navigation-and-ia-for-the-board.md). `callbackUrl` is that list, not `/signin` and not a per-role home. A User who already has a session and opens `/signin` is sent to that same list.

Do not change first-Google role assignment (new Users stay default `candidate`). Do not add apply, a recruiter pipeline, or per-role homes. Whether board chrome links to `/signin` stays [Navigation and information architecture for the board](06-navigation-and-ia-for-the-board.md).
