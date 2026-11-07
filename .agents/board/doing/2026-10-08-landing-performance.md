---
id: str-landing-performance
title: Fix landing page rendering and animation performance
type: bug
from: human
to: web
priority: high
status: doing
assignee: agent-web
reviewer: human
parent: none
depends_on: []
branch: agent/web/landing-performance
worktree: ../starter-worktrees/agent/web/landing-performance
scope:
  - apps/web/src/modules/landing/**
allowed_shared: []
created: 2026-10-08
updated: 2026-10-08
---

## What

The `/landing` page is slow: continuous WebGL shaders, blur-filter animations, and backdrop blur
run together on the whole page.

## Why / Context

- `MeshCanvas` (Paper Design `MeshGradient`, a WebGL shader) mounts 10 times on one page
  (hero, product, 5 capability tiles, 3 why cards) and animates forever, even off-screen.
- `FadeIn` and the hero animate `filter: blur()` on large containers, which is GPU-expensive.
- The sticky header and several cards use `backdrop-blur` on top of the animated shaders.

## Proposal or Ask

- Mount `MeshGradient` only while its container is near the viewport; unmount it otherwise.
- Drop the `filter: blur` entrance animation; keep opacity and transform.
- Make the sticky header background solid instead of `backdrop-blur-xl`.
- Remove `backdrop-blur` from cards that sit on top of shaders.

Definition of done: the landing page typechecks and lints clean, and the shader count on
initial load is reduced.

## Scope

**In scope:**

- `apps/web/src/modules/landing/**`

**Out of scope:**

- Global fonts and root layout, auth context, and other apps.

## Validation

- `bun run typecheck`
- `bun run lint`
- Browser check of `/landing` in dev

## Progress

Changed (uncommitted, branch agent/web/landing-performance):
- components/mesh-canvas.tsx: shader mounts only within 200px of the viewport
- components/fade-in.tsx, hero-section.tsx: removed filter-blur entrance animations
- components/site-header.tsx: backdrop-blur-xl replaced with bg-background/95
- components/cta-section.tsx, product-section.tsx, capabilities-section.tsx: removed backdrop-blur

Validation:
- bun run typecheck: pass
- bun run lint: pass (0 warnings, 0 errors)
- oxfmt --check apps/web/src/modules/landing: pass
- bun run test:e2e:web: 11 passed (includes home landing hero spec)
- browser visual check: covered by e2e only; no Playwright MCP in this session

Kept: lib/motion.ts menu-item blur (small nav items, off the hot path).

## Resolution

<Filled by the resolver when moving to done/.>
