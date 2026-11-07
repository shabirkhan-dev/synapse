# `@synapse/ui`

Shared shadcn/ui primitives for the Synapse monorepo.

This package follows the [shadcn monorepo](https://ui.shadcn.com/docs/monorepo) layout:

- UI primitives live in `src/components`
- Shared helpers in `src/lib`
- Shared hooks in `src/hooks`
- Design tokens + theme in `src/styles/globals.css`
- CLI config in `components.json`

## Add components

Run the CLI **from the app workspace** (not the package):

```bash
cd apps/console
bunx --bun shadcn@latest add button
```

The CLI installs primitives into `packages/ui` and app-only blocks into `apps/console`.

Keep `style`, `iconLibrary`, and `baseColor` identical in:

- `apps/console/components.json`
- `packages/ui/components.json`

## Importing

Preferred (deep imports — matches CLI aliases):

```tsx
import { Button } from "@synapse/ui/components/button";
import { cn } from "@synapse/ui/lib/utils";
import { useIsMobile } from "@synapse/ui/hooks/use-mobile";
```

Barrel import (still supported):

```tsx
import { Button, Card, cn } from "@synapse/ui";
```

## Styles

Apps import shared tokens from this package:

```css
@import "tailwindcss";
@import "@synapse/ui/globals.css";
@source "../../../../packages/ui/src";
```

## Migration rule

Keep product-specific composed UI in `apps/console/src/components`. Move a component here only when it is a reusable primitive with no app routing/auth/data coupling.
