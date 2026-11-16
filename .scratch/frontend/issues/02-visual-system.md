---
title: Visual system on top of Tailwind
labels:
  - wayfinder:grilling
status: closed
assignee: ayoub
parent: .scratch/frontend/map.md
blocked-by: []
---

## Question

ADR 0005 locked Tailwind as the CSS engine and explicitly did not choose a component kit.

Decide how the first screens are built:

- Raw Tailwind utility classes in Astro pages and React islands
- A React kit on top of Tailwind (for example shadcn)

Name the visual system an implementer should use. Do not design tokens or a full theme in this ticket.

Do not reopen Tailwind itself. Do not pick the first product surface here; that is [Which product surface is first](01-which-product-surface-is-first.md).

## Resolution

First screens use **shadcn/ui**. Copy the components into `src/web` (shadcn's repo-local copy, not a separate runtime kit). Tailwind stays the CSS engine (ADR 0005).

The public open-Jobs list and Job read are **React islands** that use those components. Astro pages and layouts stay a thin shell: document, layout, island mount. Do not restyle the board in Astro with a parallel utility-class UI.

Do not pick colors, radius, dark mode, or a custom theme on this map. Implementers keep shadcn init defaults (including the icon set it brings).

Where those islands get Job data (client fetch vs SSR) stays [Astro island vs SSR on board pages](07-island-vs-ssr-on-board-pages.md).
