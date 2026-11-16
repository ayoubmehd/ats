---
title: Visual system on top of Tailwind
labels:
  - wayfinder:grilling
status: open
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
