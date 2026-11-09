---
name: browser-ui-test
description: >-
  Use when verifying UI/UX or interactive logic in the browser after web changes
  (dropdowns, dialogs, theme toggles, forms, navigation, crash reports). Prefer
  Playwright MCP for exploratory clicks; use apps/console Playwright e2e for
  regressions. Keywords: browser test, UI bug, click crash, dropdown, playwright,
  e2e, hydrate, overlay, Base UI menu
---

# Browser UI test (Synapse web)

## When to use

After changing anything user-visible or interactive in `apps/console` or `packages/ui`:

- Dropdowns, menus, tooltips, dialogs, sheets
- Theme / motion controls
- Forms, auth gates, admin chrome
- Reports of “clicking X crashes the app”

Do **not** stop at typecheck alone for these changes.

## Preferred path: Playwright MCP

Needs the `playwright` MCP server (`@playwright/mcp`) configured in your editor; the repo no
longer ships an MCP config of its own.

1. Ensure the console is running (`bun run dev` or `bun run dev:console`). Default local URL: `http://localhost:3000`.
2. Call `GetMcpTools` for server `playwright`, then use tools to:
   - navigate to the affected route
   - `browser_snapshot` (accessibility tree — primary signal)
   - click / type the interaction that previously failed
   - snapshot again; watch for blank page, error overlay, or missing controls
3. If the page shows a Next.js / React error overlay, capture the message and fix the root cause before finishing.

## Regression path

The console has no committed e2e suite yet (unit and container tests: `bun --cwd=apps/console test`).
Without the Playwright MCP, drive the pre-installed Playwright from a script: start the API
(`bun run dev:api`, or the built `apps/api/dist/server.js`), build and start the console
(`bun --cwd=apps/console run build` then `node .next/standalone/apps/console/server.js`, or
`bun run dev:console`), sign up a throwaway user with `POST /api/v1/auth/sign-up`, then script the
flow with `require("playwright").chromium` and assert on roles and text (syn-018 checked: redirect
when signed out, field errors, API error message, empty state, add → row, reload keeps session,
sign-out).

## Base UI / shadcn composition traps (common crash sources)

These throw at runtime when composition is wrong — typecheck will not catch them:

| Part | Must be inside |
|------|----------------|
| `DropdownMenuLabel` | `DropdownMenuGroup` **or** `DropdownMenuRadioGroup` |
| `DropdownMenuItem` / checkbox / radio items | Group or RadioGroup as documented |
| `SelectLabel` / `SelectItem` | `SelectGroup` |

Error looks like: `MenuGroupContext is missing. Menu group parts must be used within <Menu.Group> or <Menu.RadioGroup>.`

Also avoid wrapping a **menu / dropdown trigger** inside a **Tooltip trigger** — focus and pointer ownership conflict. Put tooltips on simple icon buttons only.

## Logic vs UI checks

- **UI/UX**: open → interact → close; keyboard focus; dark/light; mobile width if layout-sensitive.
- **Logic**: assert state change (URL, localStorage key, visible label, network) via snapshot text or e2e `expect`, not screenshots alone.

## Done criteria

- Interaction that was broken no longer throws or unmounts the tree
- Lint / typecheck clean for touched packages
- For crash fixes: either MCP walkthrough noted in the reply, or a small e2e covering the path
