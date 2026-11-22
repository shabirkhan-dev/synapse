---
id: syn-089
title: automated accessibility checks on every page
type: chore
from: human
to: all
priority: normal
status: done
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: []
branch: none
worktree: none
scope: [tests/e2e, apps/console, packages/ui]
allowed_shared: []
created: 2026-11-20
updated: 2026-11-22
---

## What

An e2e spec runs axe-core on every page in light and dark and fails on serious or critical violations.

## Why / Context

Gap review 2026-11-19 (item 7): accessibility was reviewed by hand only.

## Proposal or Ask

`@axe-core/playwright` in `tests/e2e`; fix what it finds. A screen-reader pass stays manual.

## Scope

**In scope:** tests/e2e, apps/console, packages/ui.

## Validation

- lint, typecheck, unit and integration tests, e2e where a flow changes

## Resolution

Done. Commit: this change (`test(e2e): axe accessibility checks on every page, light and dark (syn-089)`).

- **The spec:** `tests/e2e/specs/accessibility.spec.ts` runs `@axe-core/playwright` 4.14.0 with
  WCAG 2.0, 2.1 and 2.2 A/AA tags on:
  - sign-in, sign-up and forgot password;
  - all twelve workspace pages, with content (sample documents and a chat answer);
  - the ⌘K palette and the account menu.

  Each runs in light and dark. Serious and critical violations fail, listing rule, impact, element
  and HTML. It runs in the existing CI `e2e` job.
- **Found and fixed:** two serious `label-content-name-mismatch` findings (WCAG 2.5.3, Label in
  Name).
  - The team picker showed the team's name but was named "Organization". It is now
    "<team> (organization)".
  - The account button showed the name and email but was named "Account menu". It is now named by
    its visible text plus a visually hidden ", account menu".

  Unit tests that matched those names exactly use a regex; the e2e specs already match by
  substring.
- **Dependency note:** the newest `@axe-core/playwright` was three days old, so 4.14.0 (from
  October) is pinned. Its `axe-core` resolved to 4.14.1 (six days old), accepted because it is a
  test-only dependency that runs inside the test browser.
- **Still manual:** a screen-reader pass.

Validation: the accessibility spec passes (2 tests, about 50 checks) and the full e2e suite passes;
console tests pass.
