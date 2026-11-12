# @synapse/ui

Shared UI primitives: [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com), style
`base-mira`, icons from [HugeIcons](https://hugeicons.com), Tailwind CSS v4.

## Add a component

Run the shadcn CLI from this package:

```bash
cd packages/ui
bunx --bun shadcn@latest add dialog
```

Components land in `src/components/` and import `cn` from `@synapse/ui/lib/utils`.

Installed: `alert`, `button`, `card`, `input`, `label`, `table`, `textarea`.

## Use it in an app

```ts
import "@synapse/ui/globals.css";
import { Button } from "@synapse/ui/components/button";
```

The app needs Tailwind's PostCSS plugin (`export { default } from "@synapse/ui/postcss.config";`)
and `transpilePackages: ["@synapse/ui"]` in `next.config.ts`.

## Tokens

Theme tokens live in `src/styles/globals.css`. Light-mode `--ring` (0.556) and `--muted-foreground`
(0.52) were darkened from the shadcn defaults so focus indicators reach 3:1 and 12px secondary text
reaches 4.5:1 on both `--background` and `--muted`; re-measure both if either token or `--muted`
changes. Inputs and textareas render 16px below `md` so iOS does not zoom on focus.
