# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `@rabtx/ui` Slider on native `<input type="range">`s (shadcn API: `value` / `defaultValue` /
  `onValueChange` as `number[]`, `onValueCommit`, `minStepsBetweenThumbs`), one value or a range of
  overlaid inputs clamped between neighbours, sizes `sm` / `md` / `lg`, `orientation="vertical"`,
  `showValue` bubbles, `marks` (with a `<datalist>`), a `ruler` variant and Field wiring. The fill,
  bubbles and marks are placed by CSS variables; the thumb grows on the press spring and the bubble
  pops on the swap spring. Registry item `@rabtx/slider`, `/docs/ui/slider`, the `/ui/slider`
  playground and `ui-slider.spec.ts`.
- `@rabtx/ui` Accordion and Collapsible on native `<details>` (shadcn API; single via `name`,
  multiple, `collapsible`; `separated`, `cards` and `flush` variants), heights animated with
  `interpolate-size` and `::details-content` on a new bouncy `expand` spring, find-in-page opening.
  Registry items `@rabtx/accordion` and `@rabtx/collapsible`, `/docs/ui/accordion`,
  `/docs/ui/collapsible`, the `/ui/accordion` playground and `ui-accordion.spec.ts`.
- `@rabtx/ui` Settings block (`@rabtx/ui/blocks/settings`, registry item `@rabtx/settings-block`
  installing to `components/blocks/settings`): Profile, Account, Notifications, Appearance and
  Danger zone on Tabs that are a sticky column or a scrolling row by a container query, one native
  form for Field/Input/Textarea, Select, Switch, Checkbox and RadioGroup choice cards, a sticky
  unsaved changes bar shown by `:has()` and `@starting-style` (Discard, Ctrl/Cmd+S, StatefulButton
  save), and Dialogs to change the email and to delete the account by a typed phrase.
  `/docs/ui/blocks/settings`, the `/ui/blocks/settings` playground and `ui-settings-block.spec.ts`.
- `@rabtx/ui` Popover and Dropdown Menu (+ ContextMenu) on the native Popover API and CSS anchor positioning, with registry items `@rabtx/popover` and `@rabtx/dropdown-menu`, `/docs/ui/popover`, `/docs/ui/dropdown-menu`, the `/ui/popover` and `/ui/dropdown-menu` playground pages and their e2e specs.
- `@rabtx/ui` Toast: a Sonner-style stacked `Toaster` in the top layer (`popover="manual"`, re-raised
  above dialogs) with six positions, `expand`, `visibleToasts` and `gap`, and the imperative
  `toast()` / `success` / `error` / `warning` / `info` / `loading` / `promise` / `dismiss` API with
  actions and cancel (our Button), icons and durations. Stacking, fan-out, `@starting-style` enter
  and `allow-discrete` exit are CSS on the toast spring; swipe writes CSS variables from pointer
  events; timers pause on hover, focus and a hidden tab; polite and assertive live regions, F6 /
  Alt+T and Escape. Registry item `@rabtx/toast`, `/docs/ui/toast`, `/ui/toast` and
  `ui-toast.spec.ts`.
- `@rabtx/ui` RadioGroup: native radios sharing one name in a `<fieldset role="radiogroup">`,
  sizes `sm` (16), `md` (20), `lg` (24), `orientation`, a `card` variant (choice cards), shadcn API
  (`value` / `defaultValue` / `onValueChange`, `RadioGroupItem` with `description`) and Field
  wiring. The dot glides to the chosen option with CSS anchor positioning on a new `glide` spring
  (each circle pops its own dot where anchors are missing). Registry item `@rabtx/radio-group`,
  `/docs/ui/radio-group`, the `/ui/radio-group` playground page and `ui-radio-group.spec.ts`.
- `@rabtx/ui` Tabs: WAI-ARIA tabs (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, shadcn API
  with `orientation` and `activationMode`) in `segmented`, `pill`, `underline` and `expandable`
  variants and sizes `sm` / `md` / `lg` (32 / 40 / 48). The indicator follows the selected tab by
  CSS anchor positioning on the `tabs` spring (the tab paints its own highlight where
  `anchor-scope` is missing), expandable labels open with a `0fr` to `1fr` grid column, panels fade
  in with `@starting-style`. Registry item `@rabtx/tabs`, `/docs/ui/tabs`, the `/ui/tabs`
  playground and `ui-tabs.spec.ts`.
- `@rabtx/ui` Dialog on the native `<dialog>` (`showModal()`, `closedby="any"`, `::backdrop`) in
  shadcn's parts, sizes `sm` / `md` / `lg`, right and bottom sheets, a View Transition `morph` from
  the trigger and CSS-only enter and exit (`@starting-style`, `allow-discrete`, panel spring).
  Registry item `@rabtx/dialog`, `/docs/ui/dialog`, the `/ui/dialog` playground and
  `ui-dialog.spec.ts`.
- `@rabtx/ui` Tooltip on `popover="hint"` placed by CSS anchor positioning (`position-area`,
  `position-try-fallbacks` flipping, `position-visibility`), shadcn's parts (`TooltipProvider` with
  `delayDuration` / `skipDelayDuration`, `Tooltip`, `TooltipTrigger` with `asChild`,
  `TooltipContent` with `side` / `align` / `sideOffset` / `arrow`) plus `asLabel` and a
  `TooltipKbd` key cap, `interestfor` before hydration and a CSS-only enter and exit
  (`@starting-style`, `allow-discrete`, unfold spring). Registry item `@rabtx/tooltip`,
  `/docs/ui/tooltip`, the `/ui/tooltip` playground and `ui-tooltip.spec.ts`.
- `@rabtx/ui` Blocks, starting with a sign-up block (`@rabtx/ui/blocks/signup`, registry item
  `@rabtx/signup-block` as a `registry:block` installing to `components/blocks/signup`): a
  three-step Card (details, emailed code with resend countdown, done) built only from Input,
  PasswordInput, InputOTP, Select, Checkbox, Switch, Field and StatefulButton, with native
  constraint validation, CSS step transitions and focus moved to each step's heading, plus a
  compact `SigninBlock`. `/docs/ui/blocks/signup`, the `/ui/blocks/signup` playground and
  `ui-signup-block.spec.ts`.
- `@rabtx/ui` Command palette block (`@rabtx/ui/blocks/command`, registry item `@rabtx/command-block`
  installing to `components/blocks/command`): `CommandBlock` (⌘K / Ctrl+K, a trigger showing the
  shortcut, a native Dialog) and the inline `CommandPanel`, built from Dialog, Input, Badge, Button
  and Tabs. Data-driven commands with fuzzy search, groups, recent items, nested and async pages,
  loading and empty states, an ARIA combobox over a listbox (`aria-activedescendant`), a highlight
  that slides by CSS anchor positioning and a list that eases to its height.
  `/docs/ui/blocks/command`, the `/ui/blocks/command` playground and `ui-command-block.spec.ts`.
- `@rabtx/ui` Checkbox rebuilt on a native checkbox laid over a box styled with `:has()`: sizes
  `sm` (16), `md` (20, default), `lg` (24); shadcn API (`checked` incl. `"indeterminate"`,
  `defaultChecked`, `onCheckedChange`) plus `indeterminate` and `description`; Field and
  `aria-invalid` error state; the tick pops in and draws itself with `stroke-dashoffset` on a new
  `check` spring, all in CSS. `/docs/ui/checkbox` and the `/ui/checkbox` playground updated
  (`mixed` is now `indeterminate`).
- `@rabtx/ui` Switch: a native checkbox with `role="switch"` and the `switch` attribute, sizes
  `sm` (36x20), `md` (48x28) and `lg` (56x32), `checked` / `defaultChecked` / `onCheckedChange`,
  a label row via children and `Field` wiring. The thumb stretches toward its destination and
  squishes on press, then springs across on the `switch` spring, all in CSS. Registry item
  `@rabtx/switch`, `/docs/ui/switch`, the `/ui/switch` playground page and `ui-switch.spec.ts`.
- `@rabtx/ui` Input rebuilt on the native `<input>` in the Select trigger's look: sizes `sm` (32),
  `md` (40), `lg` (48), `outline` and `filled` (the recessed field) variants, `pill`, icons,
  `startAddon` / `endAddon`, `clearable`, `success`, a floating `label`, `action`, plus
  `PasswordInput` and `InputOTP` (one input with `one-time-code` autofill shown as slots). State is
  read in CSS (`:has()`, `:focus-visible`, `:user-invalid`, `:placeholder-shown`); the shake, label
  float, eye swap, tick draw, ring glide and character roll are CSS only. Textarea moved to the same
  look and grows with its text (`field-sizing: content`). `/docs/ui/input` added. **Breaking:**
  Input sizes `xl` and `2xl` are gone and `md` is now 40px.
- `@rabtx/ui` Card rebuilt on shadcn's parts (`Card`, `CardHeader`, `CardTitle`,
  `CardDescription`, `CardAction`, `CardContent`, `CardFooter`, sizes `sm` / `default` / `lg`), with
  CSS-only link and selectable cards (`cardParts.target` plus `:has()`), `TiltCard`,
  `SpotlightCard`, `ExpandableCard` (`<details>`) and `CardStack`; `/docs/ui/card`, the `/ui/card`
  playground and its e2e spec. Replaces `padding` and `cardParts.title/description/meta`.
- `@rabtx/ui` shadcn registry: every component (`button`, `select`, `input`, `textarea`, `field`,
  `checkbox`, `card`, `badge`) plus `theme`, the shared `rabtx` style, `springs`, `utils` and
  `use-base-select` items, built by `bun run registry` (`shadcn build`) into
  `apps/docs/registry/r` and served by the docs at `/r/<name>.json`. Install with
  `npx shadcn@latest add @rabtx/button` (namespace) or by URL; files land in the project's own
  `components/ui` through its aliases, use its `cn` and its shadcn theme, with no `@rabtx/ui`
  dependency. `bun run registry:check` (in `ci:lint`) fails when the built registry is stale.
- `apps/docs`: `/docs/ui/theming` (every token from `theme.css` with live light and dark swatches,
  modes, how to customise) and an **Installation** block (CLI and Manual tabs, read from the
  registry item) on each component page.
- `@rabtx/ui` Select rebuilt on the native `<select>`: sizes `sm` (32), `md` (40), `lg` (48),
  `SelectItem` (optional `icon`), `SelectGroup`, `SelectSeparator`, `onValueChange`, `placeholder`
  and `leadingIcon`. Where `appearance: base-select` exists the list unfolds from the trigger,
  pulls away into its gap, pinches the trigger's corners and fades its rows in, all in CSS, and
  opens above when there is no room below. `--rx-select-*` tokens; a new `unfold` spring.
- `apps/docs`: `/docs/ui/select` with live examples and their source.
- `@rabtx/ui` Button rebuilt with CSS-only motion: `primary`, `secondary`, `ghost` and `outline`;
  sizes `sm` (32), `md` (40), `lg` (48) and `icon` (32 square, `aria-label` required by type);
  hover growth on fine pointers, spring press (`pressScale`), optional `ripple`, plus `ButtonLink`,
  `StatefulButton` (idle, loading, success, error with a letter-by-letter label roll),
  `MagneticButton` and `MetallicButton`. Colors, radius and scales are `--rx-btn-*` variables.
  New `label` and `magnetic` springs in `@rabtx/ui/motion`.
- `apps/docs`: a UI section (`/docs/ui`) with a live Button page (every variant, size and state
  above its source).
- `apps/ai-api`: Bun + Hono + TypeScript AI service. Zod-validated env, nest-api JWT auth (HS256,
  shared `JWT_SECRET`), RAG on Postgres + pgvector via Drizzle (`rag_documents` / `rag_chunks`,
  HNSW cosine index, ingest + top-k query + grounded answer), streaming tool-calling chat with the
  AI SDK (`searchDocuments`, `currentTime` tools) over any OpenAI-compatible provider (OpenRouter by
  default), OpenAPI 3.1 at `/api/openapi.json` with a Scalar reference at `/api/docs`, `bun test`
  suite with mocked LLM/embeddings plus an opt-in pgvector integration test, Dockerfile, compose
  fragment, Render service, `bun run dev:ai` and a CI job. Docs: `/docs/ai-api`.
- NestJS auth API (`/api/v1/auth/*`) with JWT login/register/me for the web app.
- Shared UI auth components via shadcn (`alert`, `spinner`, `input-group`) in `@starter/ui`.
- Web login/register flows that call Nest only (no multi-backend API switcher).
- Conventional Commits enforcement in `commit-msg` hook (typed prefixes + all-lowercase subjects).
- Docker Compose services for Nest API and Next.js web (multi-stage images, healthchecks, no Compose `version` key).

### Changed

- `@rabtx/ui` motion preferences: every component's reduced-motion and `data-motion="off"` rules
  move out of `@layer components` into an `rx-motion` cascade layer declared after it, with off
  after less motion. The shadcn CLI merges each item's `@media (prefers-reduced-motion: reduce)`
  block into the first one in a project's CSS, ahead of the rules it overrides, so in installed
  projects some overrides lost (the switch kept its transitions). The layer wins wherever the block
  lands, so the `!important`s that stood in for it are gone, and `build-registry.ts` fails if a
  motion rule is left outside the layer.
- **Breaking (`@rabtx/ui` theming):** `tokens.css` and `springs.css` are replaced by one
  shadcn-style file, `src/styles/theme.css` (also exported as `@rabtx/ui/theme.css`): shadcn token
  names on `:root` and `.dark`, mapped into Tailwind with `@theme inline`, plus Rabtx extras
  (`--subtle-foreground`, `--success`, `--field*`, `--surface-*`, `--radius-*` tiers, `--shadow-*`,
  `--spring-*`). Every `--rx-*` token and the per-component `--rx-btn-*` / `--rx-select-*`
  overrides are gone; components read only the semantic tokens. Dark mode is the `.dark` class
  (`data-theme` is no longer read), and the class `rabtx` scopes the theme to a subtree.
- **Breaking (`@rabtx/ui/select`):** heights are 32/40/48 (were 28/32/36) and the trigger is a
  bordered surface instead of the recessed field, so it no longer follows `data-depth` (Flat only
  drops the list shadow). Plain `<option>` children still work.
- **Breaking (`@rabtx/ui/button`):** variants `accent` and `danger`, sizes `xl` and `2xl`, and the
  `loading`, `static`, `iconOnly`, `leadingIcon` and `trailingIcon` props are gone. Use
  `StatefulButton` for loading, `size="icon"` for icon-only, and put icons in the children. The
  `rx-primary`, `rx-secondary`, `rx-ghost`, `rx-accent` and `rx-danger` utilities and the tokens
  only they used were removed. The `/ui` playground and its e2e spec follow the new API.
- Compose Postgres image is now `pgvector/pgvector:0.8.7-pg18-trixie` (Postgres 18 + pgvector) for
  `apps/ai-api`; see docker/README.md "Switching to the pgvector image".
- `apps/rust/Dockerfile` builds from the monorepo root context (it copied a non-existent root
  `Cargo.toml`).
- Documentation lives only in `apps/docs` (Fumadocs). Removed the root `docs/` pointer folder.
- Architecture boundary check scopes deep `@/modules/*/*/*` imports to consumers outside `src/modules/`.
- Root `format` script tolerates missing local `cargo`/`shfmt` tooling.
- Agent and README docs maps point at `apps/docs` routes (`http://localhost:3002/docs`).

### Removed

- `apps/ai-api` (Python FastAPI AI service) and the AI assist feature that proxied to it: Nest
  `modules/ai` (`/api/v1/ai/*`, `AI_API_URL`, `AI_SERVICE_TOKEN`), the web `/admin/ai` page and nav
  item, and its compose/Render config.
- All Python tooling: `scripts/python`, Ruff/uv in `.mise.toml`, CI `setup-uv`, devcontainer and
  VS Code Python setup.
- Root `docs/` directory (stale pointer after the docs app migration).
- Web API backend switcher (Python / Rust / Hono).

## [0.1.0] - 2026-02-10

### Added

- Initial Starter monorepo layout (Turborepo + Bun).
- Dual license: MIT and Apache-2.0.

[Unreleased]: https://github.com/shabirkhan-dev/starter/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/shabirkhan-dev/starter/releases/tag/v0.1.0
