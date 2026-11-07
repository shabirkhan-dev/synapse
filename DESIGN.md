# Design System Brief

This file is the source of truth for AI agents and humans when creating UI in this Starter.
Keep it updated before generating new screens with Codex, Claude Code, Cursor, v0, Open Design,
Figma MCP, Onlook, Scamp, or similar tools.

## Product Intent

This Starter should produce production-grade application interfaces, not generic demo pages.
Generated UI must feel domain-specific, accessible, responsive, and built from reusable components.

## Audience

- Developers starting new products from this monorepo.
- Designers or product builders using AI tools to explore screens.
- AI coding agents implementing UI from product briefs, Figma frames, or design-system prompts.

## Visual Principles

- Prefer clear hierarchy over decoration.
- Prefer operational density for dashboards, admin panels, and internal tools.
- Prefer calm, readable surfaces for documentation and product workflows.
- Avoid generic SaaS hero sections inside actual applications.
- Avoid decorative blobs, background glows, unnecessary nested cards, and one-note purple/blue gradients.
  Glass is an intentional `kind` described below, not a default page decoration.
- Use real state design: loading, empty, error, disabled, hover, focus-visible, selected, saving,
  success, and permission denied.

## Rabtx UI: shared design intent

This section records the owner's locked direction. Use it when another agent or session takes
on a component. Existing code is an implementation to assess, not proof that the design is finished.

### Direction (locked 2026-10-07)

`@rabtx/ui` is being rebuilt from scratch, one component at a time. It is not a styled layer over
shadcn and it does not inherit `@starter/ui`'s components.

- **Design source:** the Reptex/Grid design system in Figma (see Figma source below). Where this
  file and Figma disagree on a visual decision, Figma wins, with two exceptions: no shadows, and
  depth has two modes (Flat and Floating), not three. Record the component's Figma node ID on its
  card.
- **No animation library.** Motion is CSS only on the web (see Motion). Do not add `motion`,
  `framer-motion`, GSAP or similar. JavaScript may set state (an attribute, a CSS variable) but the
  animation itself lives in CSS.
- **shadcn is kept only for its CLI** (`components.json`, registry and add-component workflow). Its
  component code is not the foundation and is replaced component by component.
- **Tailwind CSS stays** as the styling system, on the shared tokens.
- **Icons are HugeIcons only** (`@hugeicons/react` on web, `@hugeicons/react-native` on native), at
  the sizes the design uses. `lucide-react`, `lucide-react-native` and any other icon set are not
  used.
- **Two targets, one design language:** web components and real React Native/Expo components that
  share tokens, spring parameters and design intent, but not rendering code.
- **Clean components:** a component carries no per-style branching. Radius and depth come from token
  modes, and each `kind` is a ready-made set of classes applied only when selected.
- **Playground:** `apps/web` at `/ui` is the playground that showcases `@rabtx/ui`. It is rebuilt
  fresh; the earlier shadcn lab and the docs `/rabtx` preview pages are deleted.

### Figma source

File: `rabtx Design System`, key `en7xSFtcVYHkX7Iwo4hONQ`
(`https://www.figma.com/design/en7xSFtcVYHkX7Iwo4hONQ/rabtx-Design-System`). Pages: Cover (`0:1`),
Icons (`2:155`), Components (`2:156`). Each component is a `Section/<name>` frame on the Components
page; the node IDs below are for that frame.

Button `5:6`, Icon Button `5:191`, Input `6:14`, Checkbox `6:59`, Task Check `6:78`, Toggle `6:103`,
Badge `6:116`, Chip `6:139`, Nav Item `7:23`, Menu Item `7:46`, Kbd `7:179`, Avatar `7:185`,
Tab `7:202`, Tooltip `7:231`, Toast `7:238`, Status Icon `8:85`, Composer `8:104`, Dialog `8:162`,
Banner Card `8:194`, Kanban Card `9:139`, Kanban Column `9:174`, Table `9:235`, Top Bar `9:325`,
Sidebar `9:383`, Option Card `26:400`, Step Progress `26:425`, Field `26:436`, Mobile `27:419`,
App Icon `40:408`, Tag `42:441`, Progress Ring `42:516`, Shape & Depth `55:502`, Select `66:770`,
Textarea `66:783`, Radio `66:794`, Segmented Control `66:846`, Alert `67:751`,
Progress Bar `67:788`, Skeleton `67:802`, Empty State `67:851`, Command Palette `68:823`,
Pagination `68:877`, Breadcrumb `68:897`, Avatar Group `68:929`, Setting Row `69:823`,
Stat Card `69:860`, Plan Card `69:936`, Tool Call `112:893`, Diff Card `112:910`,
Approval Card `112:1010`, Inbox Row `113:993`, File Tree Item `113:1088`, Picker Row `113:1120`,
Grid Shell `113:12741`, Thread Status `128:1062`, Thread Row `128:1111`, PR Row `128:1224`,
Banner `129:17096`. Product-specific sections (Composer, Kanban, Tool Call, Diff, Approval,
Thread, PR, Inbox) are Grid app components, not part of the first library pass.

Tokens read from Figma so far, as a starting point; read each component's own variables before
building it:

- Names are `--color-*`, `--space-*`, `--radius-*`, `--size-*`.
- Radius 4, 6, 8, 12 and 999. Space 0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32.
- Control height 24 (sm), 28 (md), 36 (xl), 44 (2xl) and 48 (3xl); nav row height 28.
- Type is SF Pro at 12/16, 13/20, 14/20 and 18/26 (regular 400, medium 510), letter spacing -0.15.
- Dark colors: surface `#212121`, subtle `#1b1b1b`, pressed `#303030`, border `#303030` and strong
  `#3d3d3d`; text `#ebebeb`, `#a3a3a3`, `#7f7f7f`; accent `#2d7cf6`; danger `#f0686d`.
- Light colors (Button section): app and surface `#ffffff`, inverse `#1b1b1b` (hover `#292929`),
  pressed `#f2f2f2`, selected `#ebebeb`, border `#f2f2f2` and strong `#e3e3e3`; text `#292929`,
  `#5d5d5d`, `#9e9e9e`, disabled `#a3a3a3`; accent `#2d7cf6` (hover `#1f66db`); danger `#e5484d`.
- Button (`5:6`) is a matrix of style by size by state (default, hover, pressed, disabled). Styles:
  black primary, blue accent, hairline secondary, secondary, ghost and danger. It repeats for two
  radius modes (default and fully round) and two depth modes.

### Dependency policy

The goal is a clean, modern implementation, not zero dependencies. Component libraries became the
default mainly to get accessibility and interaction behavior that native HTML lacked. Modern
browsers now provide much of it, so prefer the platform first.

1. **Platform first (web).** Reach for native HTML and CSS before any package: `<dialog>`, the
   Popover API, `<details>`, `inert`, CSS anchor positioning, `:focus-visible`, `:has()`,
   `@starting-style`, `@property`, `linear()` easing, View Transitions and
   `prefers-reduced-motion`. Check each feature against the browser baseline the product supports
   before using it, and note that baseline on the component.
2. **Accessibility is not optional.** Keyboard operation, focus management, roles, names and
   states must be at least as good as the library being replaced. Verify with the keyboard and a
   screen reader, not just by reading the markup.
3. **A dependency needs a written reason.** State the platform gap it fills (usually an accessible
   behavior the platform cannot yet do) and the condition under which it can be removed. Without
   that, do not add it. Animation is never a valid reason on the web.
4. **Native (Expo / React Native) follows the same rule**, but the platform surface is smaller, so
   some dependencies (Expo modules, gesture and animation runtime) are expected. Which animation
   runtime native uses is an open decision (see below); it must take the same spring parameters as
   the web.
5. **Remove, do not stack.** Replacing a dependency means deleting it and its imports in the same
   change, not running two systems side by side.

### Goal and scope

Web components must be responsive by default and work on desktop browsers. Mobile means real React
Native/Expo components, not just a narrow web layout. Share the design language and tokens; use
platform-specific rendering and interactions where needed. No separate desktop library is required
now.

Work on one component at a time. Keep the implementation minimal (KISS, DRY, Ponytail): every
wrapper, style, dependency and abstraction must solve a current need. “Minimal” does not mean
omitting accessibility, useful feedback or the detailing that defines the depth treatment.

### Radius, depth and kind

Components vary along independent axes: color role (`variant`), size, and the three below. The old
four materials (`solid`, `detail`, `glass`, `terminal`) no longer exist.

**Radius** has three modes: Sharp, Default and Round. The terminal look is the Sharp mode; a
monospace font is applied globally by the app, never by a component. Radius is tiered, so a mode can
round the things that should be round without over-rounding the things that hold text:

| Tier | Used for | Sharp | Default | Round |
| --- | --- | --- | --- | --- |
| button | buttons (small size uses 6px in Default) | 2px | 8px | full |
| pill | tags, count badges | 2px | full | full |
| control | inputs, nav items, cards | 2px | 8px | 12px |
| item | menu and select options, checkboxes | 2px | 6px | 10px |
| box | dialogs, popovers, sheets | 4px | 12px | 20px |

Round must never turn a card or a select option into a near-capsule: only buttons and pills go fully round.
Default matches Figma's `--radius-sm/md/lg/full` (6, 8, 12, 999). Check every component in Round
with long text.

**Depth** has two modes, Flat and Floating. Figma also draws a middle "Raised" mode and draws depth
with drop shadows; the owner will update Figma, and until then do not copy either.

- **Flat** is one simple 1px border. No second edge, no ring, no gradient.
- **Floating** is the depth. It uses no cast or blurred shadows. A surface has a real 1px border
  painted with a vertical gradient (light top edge to dark bottom edge), a 1px hairline ring just
  outside it, and faint sheen (top) and shade (bottom) gradients inside. Inputs and tracks use the
  inverse (a recessed well: dark top edge, light bottom edge).

The edge must be a border, not an inset shadow line: inset lines are straight and get clipped by the
corner radius, which makes the highlight look cut. A gradient border follows the radius exactly.

```css
@property --fill { syntax: "<color>"; inherits: false; initial-value: transparent; }
/* mode switches the variables only; components never branch on depth */
[data-depth="flat"]     { --e-ring: transparent; --e-edge-a: var(--line); --e-edge-b: var(--line); --e-sheen: transparent; --e-shade: transparent; }
[data-depth="floating"] { --e-ring: rgb(0 0 0 / .6); --e-edge-a: rgb(255 255 255 / .18); --e-edge-b: rgb(0 0 0 / .4); --e-sheen: rgb(255 255 255 / .06); --e-shade: rgb(0 0 0 / .16); }

.depth {
	border: 1px solid transparent;
	background:
		linear-gradient(180deg, var(--e-sheen), transparent 40%, transparent 60%, var(--e-shade)) padding-box,
		linear-gradient(var(--fill), var(--fill)) padding-box,
		linear-gradient(180deg, var(--e-edge-a), var(--e-edge-b)) border-box;
	box-shadow: 0 0 0 1px var(--e-ring);
}
```

Colors inside gradients are registered with `@property` so they can transition. The values above are
the dark-theme values from the sales-crm reference; Light needs its own set. Overlays (dialogs,
popovers, sheets) separate with the same edge plus a dimmed backdrop, never a cast shadow.

**Kind.** Reserved for a treatment that needs its own look. Today only `glass`. Each kind is a
ready-made set of classes applied only when that kind is selected, so the component itself stays
free of per-kind logic. `glass` is deliberately simple; its exact look is open.

Radius and depth ship as token modes: CSS variables switched by `data-radius` and `data-depth` on a
container, so components do not need props for them. Size is the same kind of mode. `data-size="sm" | "md" | "lg"`
on an ancestor resizes the default control (button, field, select, slider, tabs, checkbox, switch and radio).
An explicit `size` on one component still wins.

Animation time is one number. Set `--motion-ms` (milliseconds, without a unit) on an ancestor and every spring
duration follows it. The easing curves stay. The docs UI view exposes that number as a single slider.

Do not interpret polished as “add more shadows, glow or animation.”

### Motion and interaction

Motion is on by default, purposeful and restrained, and CSS only on the web. Press and release feel
responsive without moving surrounding layout. Respect reduced motion; a Motion off switch must
also leave every state visible. Disabled controls must not activate or animate as
enabled ones. Motion is never the only feedback channel.
Reduced-motion and Motion off rules live in the `rx-motion` cascade layer, after
`components` (less motion first, off after it), so they win without `!important` and whatever the
order a shadcn project's CSS ends up in.

- **Springs** are defined by stiffness, damping and mass, solved into a CSS `linear()` easing with
  the settle time as the duration. The same three numbers feed the native runtime. Values:

  | Use | Stiffness / damping / mass | Notes |
  | --- | --- | --- |
  | Press | 500 / 30 / 0.6 | scale 0.93 on press, about 280ms |
  | Tabs indicator | 245 / 36 / 1.2 | no overshoot, about 670ms |
  | Swap (icon, label, morph) | 460 / 30 / 1 | about 5% overshoot |
  | Button label (letters, status icons, width) | 460 / 30 / 0.55 | about 245ms, no visible overshoot |
  | Check (tick and dash draw, glyph pop) | 784 / 56 / 1 | critically damped, about 306ms |
  | Magnetic (follow the pointer) | 200 / 15 / 0.3 | about 300ms |
  | Unfold (a list from its trigger) | 987 / 55.3 / 1 | about 250ms, a hint of bounce |
  | Switch thumb | 800 / 80 / 4 | squish to 0.9 |
  | Toast | 420 / 34 / 0.75 | in: y 22, scale 0.96, blur 10 |
  | Panel (dialog, sheet) | 420 / 40 / 0.5 | exit shorter than enter |

  Springs given as duration and bounce convert as stiffness = (2π / duration)² and damping ratio =
  1 minus bounce.
- **State changes** (hover, focus, selected) use `cubic-bezier(0.25, 1, 0.5, 1)` for about 150ms.
  High-frequency interactions (row hover, tab switch, keystrokes) get instant or near-instant
  feedback.
- **Icon and label swaps** cross-fade with scale 0.25 to 1, opacity and 4px blur over 300ms
  (`cubic-bezier(0.2, 0, 0, 1)`). Exits are shorter than enters.
- **Limits:** a `linear()` spring is a fixed curve. If interrupted it restarts from the current value
  with no velocity carried over, and its duration does not depend on distance. Drag, swipe and
  momentum need JavaScript; the tooltip "warm window" does too. View Transitions snapshot the
  element, so a shared-element morph is a picture while it moves. Where one real element can morph
  by itself (width, height, radius, fill), prefer that.

Review default, hover (web), keyboard focus, pressed, disabled, loading and success states where
applicable. Include leading and trailing icons and icon-only examples with accessible names. Keep
labels and dimensions stable during state changes.

### Open decisions

These are not settled; do not guess them.

- **Native motion runtime.** Whether `react-native-reanimated` is acceptable or the built-in
  `Animated` API is used. Either way it takes the same spring parameters as the web.
- **Glass.** How far it goes (translucency plus blur, or closer to Apple's liquid glass).
- What `@starter/ui` becomes once components are rebuilt (tokens and CLI config only, or removed).
- Whether both light and dark themes ship in the first pass (Figma shows both).
- Mapping Figma's token names (`--color-*`, `--space-*`, `--radius-*`, `--size-*`) onto the existing
  shadcn names in `packages/ui/src/styles/globals.css`.
- Font. Figma uses SF Pro, which exists only on Apple platforms; the web and Android fallback is
  undecided. A global monospace option is app-level theming, not a component concern.
- The order after Button. Button is first.

### Consistency and review

The same language applies to cards, inputs, sidebar items and the surrounding application shell. Use
semantic color and helpful SVGs where they clarify content, without decorative color noise. Do not
redesign every screen as part of a single component task.

Before moving to the next component, review the current one in the playground across Flat and
Floating, Sharp, Default and Round, Motion on and off, light and dark, every size and state, and long
text. Be explicit about untested native behavior and simplified glass fallbacks.

### Current implementation and preview

State as of 2026-10-07. Verify against the repo before relying on it.

- `packages/ui` (`@starter/ui`): the original shadcn-style web components (about 30), `motion/*`
  variants and `mobile/*` components, plus the shared tokens. The apps still consume it. It is the
  thing being replaced, not the foundation to extend.
- `packages/rabtx` (`@rabtx/ui`): the rebuild target. Built so far: the tokens and modes
  (one shadcn-style theme file, `src/styles/theme.css`), the spring solver (`src/motion`, generating
  the `--spring-*` tokens in `theme.css`) and **Button**.
  Styling is Tailwind first: `src/styles/control.css` holds the shared depth recipe (`rx-surface`,
  `rx-card`) and the flat and motion-off rules for cards.
  Exports: `@rabtx/ui/button`, `@rabtx/ui/button/styles`, `@rabtx/ui/input`,
  `@rabtx/ui/input/styles`, `@rabtx/ui/field`, `@rabtx/ui/field/styles`, `@rabtx/ui/textarea`,
  `@rabtx/ui/textarea/styles`, `@rabtx/ui/card`, `@rabtx/ui/card/styles`, `@rabtx/ui/dialog`, `@rabtx/ui/dialog/styles`, `@rabtx/ui/badge`, `@rabtx/ui/badge/styles`,
  `@rabtx/ui/select`, `@rabtx/ui/select/styles`, `@rabtx/ui/slider`, `@rabtx/ui/slider/styles`,
  `@rabtx/ui/checkbox`, `@rabtx/ui/checkbox/styles`,
  `@rabtx/ui/motion`, `@rabtx/ui/blocks/signup`, `@rabtx/ui/styles.css`, `@rabtx/ui/theme.css`.
  `@rabtx/ui/select`, `@rabtx/ui/select/styles`, `@rabtx/ui/checkbox`, `@rabtx/ui/checkbox/styles`,
  `@rabtx/ui/motion`, `@rabtx/ui/blocks/signup`, `@rabtx/ui/blocks/settings`, `@rabtx/ui/styles.css`, `@rabtx/ui/theme.css`.
- Theming: `src/styles/theme.css` is the only place a color, radius, shadow or easing is defined.
  Components read the shadcn semantic tokens (and the documented Rabtx extras) and never define
  their own override variables; private `--_*` variables are allowed for internal plumbing.
- Registry: `packages/rabtx/scripts/build-registry.ts` turns the package into shadcn registry items
  (`apps/docs/registry/r/*.json`, served at `/r/<name>.json`). Keep imports inside a component
  folder relative, shared helpers in `src/lib` or `src/hooks`, and run `bun run registry` after
  changing a component or its CSS; CI fails on a stale registry.
- **Button**: four tones (primary, secondary, ghost, outline) and four sizes (sm 32, md 40, lg 48,
  all pill shaped; icon, a 32px square on the button radius tier), drawn by `src/styles/button.css`
  (plain CSS in the components layer, so `className` utilities still win). `buttonClass()` in
  `button.styles.ts` returns the class names (`rx-btn rx-btn-primary rx-btn-md`) with no framework
  code. Hover grows to 1.02 only under `(hover: hover) and (pointer: fine)`; press springs to
  `pressScale` (0.93) on the press spring; disabled is 50% opacity with no pointer events; focus is
  the shared 2px ring. Extras, all in the same export: `ripple` (a disc of the text color spawned at
  the press, keyframes 0.05 to 1 scale over 1.6s), `ButtonLink` (an `<a>`), `StatefulButton` (idle,
  loading, success, error: status icons are always in the DOM and widen in or fold away with
  transitions; the label rolls over letter by letter with staggered keyframes; the label box eases
  to the measured width), `MagneticButton` (the pointer writes `--_btn-mx` / `--_btn-my`, a
  `translate` transition on the magnetic spring follows) and `MetallicButton` (a chrome gradient
  rim drifting on an 8s loop, a hover sweep, a face inset 2px). JavaScript only sets state: ripple
  position, magnetic offset, label width and which label is leaving. Colors and radius come only from
  the theme tokens (`--primary`, `--secondary`, `--accent`, `--input`, `--ring`, `--radius-button`),
  so the Figma values are dropped into `theme.css`, not into the component. **Deviation from Figma:** this look (blue primary, pill sizes, no depth
  modes) replaces Figma's black primary, accent and danger tones and the 24 to 48 size matrix; the
  Button ignores `data-depth`. Reconcile when the Figma design system is shared.
- **Input** (Figma `6:14`): a native `<input>` inside a wrapper (`rx-input-field`, drawn by
  `src/styles/input.css`) that holds icons, addons, a floating label and small buttons. **Deviation
  from Figma, like the Select:** the default `outline` look is the Select trigger's (sizes 32, 40
  and 48, `--card` fill, `--input` edge, `--radius-box`, the same hover, focus and error), so an
  Input, a Select and a Button of one size line up; Figma's recessed 28 to 48 field survives as
  `variant="filled"` (the `--field*` tokens; Flat makes it one border). The platform carries the
  state and CSS reads it with `:has()`: focus is `:focus-visible`; an error is `aria-invalid` (from
  Field) or `:user-invalid` (native constraints, only after editing), and the error rule also sets
  a one-shot shake keyframe; emptiness is `:placeholder-shown` (the component always sets a
  placeholder), which shows the clear button and floats the label. Extras: `leadingIcon` /
  `trailingIcon` (decorative, hidden), `startAddon` / `endAddon` (divided segments), `pill`,
  `clearable` (empties the input through the native value setter so controlled inputs get
  `onChange`), `success` (a tick drawn with `stroke-dashoffset`), a floating `label` (on the label
  spring; md and lg only), `action` (your own trailing button), `PasswordInput` (an eye with
  `aria-pressed`, glyphs cross-fading with blur) and `InputOTP` (one real input with
  `autocomplete="one-time-code"` over aria-hidden slots; the ring glides on the swap spring and
  characters roll in). No animation library. Figma's placeholder color (`#9e9e9e` on white) is
  below 4.5:1; kept as specified, flagged for the design owner.
- **Field** (Figma `26:436`): a label (13/20 medium), one control and an optional 12/16 hint, 6px
  apart. It owns the wiring: a generated `id` for the label, the hint or error linked with
  `aria-describedby`, `aria-invalid` on an error, and a polite live region for the message. The
  control reads this from a React context, so Textarea and Select can join it later. The context is
  internal (not exported) so server files can import `@rabtx/ui/field`. The hint (`#9e9e9e`) and
  error (`#e5484d`) text colors are as specified and are below 4.5:1 on white; flagged.
- **Textarea** (Figma `66:783`): the `<textarea>` itself is the field (`rx-textarea`, drawn by
  `src/styles/textarea.css`), in the Input's outline look so a form does not mix two field looks:
  `--card` fill, `--input` edge, `--radius-box`, the same focus and error (`aria-invalid` or
  `:user-invalid`), 14/20 text. It grows with its text (`field-sizing: content`) from a 96px
  minimum and still resizes vertically by hand. Figma draws it white with a plain border, which this
  now matches.
- **Card**: Figma has no generic Card section, so this is the container shared by its Kanban (12px
  padding), Option (16) and Stat (20) cards: surface fill, 1px `#f2f2f2` border, the box radius tier
  (12 Default, 20 Round, 4 Sharp). Floating uses the raised-surface edge and ring (as the secondary
  Button); Figma's cast shadow is dropped. `rx-surface` was split out of `rx-control` so a card is the
  plain surface with no hover or press. API follows shadcn's parts and `data-slot` names (`Card`
  with `size` sm, default or lg and an `as` tag, `CardHeader`, `CardTitle`, `CardDescription`,
  `CardAction`, `CardContent`, `CardFooter`); each part pads itself, media placed directly inside
  runs edge to edge, and the header is a container so a narrow card drops its action under the
  title. `card.css` draws the rest, CSS only: a link, button or label with `cardParts.target`
  stretches over the card and the card derives hover, a 0.985 press, the focus ring and a `--primary`
  selected edge (a checked input) through `:has()`; `TiltCard` (3D lean on the magnetic spring with a
  glare, pointer written as `--_tilt-*` / `--_px` / `--_py`), `SpotlightCard` (a radial light and a
  masked 1px lit edge in `--primary`), `ExpandableCard` (`<details>` with `::details-content` and
  `interpolate-size` on the panel spring) and `CardStack` (items `interpolate-size` between a 10px
  peek and `auto`, inert while hidden, a real toggle button). Deviation: the description uses the
  secondary gray (passes 4.5:1) where Figma's Option Card uses the tertiary gray; flagged. Option
  Card (selectable) and Stat Card are separate Figma components; the selectable card covers the
  former's behaviour until it is drawn.
- **Dialog** (Figma `8:162` not yet read): a native `<dialog>` opened with `showModal()`, so the
  top layer, the inert page, the focus move and return, Escape and (with `closedby="any"`) light
  dismiss come from the browser; a click handler covers light dismiss where `closedby` is missing.
  shadcn's parts and `data-slot` names (`Dialog` with `open` / `defaultOpen` / `onOpenChange`,
  `modal` and `morph`; `DialogTrigger` and `DialogClose` with `asChild`; `DialogContent` with
  `size` sm, md or lg (24, 32, 42rem), `side` center, right or bottom, `showClose`, `closeLabel` and
  `dismissible`; `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`), with
  `aria-labelledby` / `aria-describedby` wired by context. The panel is the raised surface in
  `--popover` with the box radius; no cast shadow (the overlay rule above), the backdrop is
  `--background` pulled toward black at 45% with a 2px blur. Motion is CSS: `@starting-style` and
  the panel spring in, a shorter eased exit with `display` / `overlay` `allow-discrete`; sheets slide
  from their edge. `morph` is a View Transition between the trigger and the panel (typed
  `rx-morph-open` / `rx-morph-close`, the box on the panel spring, each picture clipped by it) and
  falls back to the scale and fade. Before hydration the trigger carries `command="show-modal"`
  (Invoker Commands). Scroll lock is `:root:has(.rx-dialog:modal) { overflow: hidden }`.
- **Tooltip** (Figma `7:231` not yet read; built 2026-11-01): shadcn's parts (`TooltipProvider`
  with `delayDuration` 120 and `skipDelayDuration` 300, `Tooltip` with `open` / `defaultOpen` /
  `onOpenChange`, `delayDuration`, `disabled` and `asLabel`, `TooltipTrigger` with `asChild`,
  `TooltipContent` with `side`, `align`, `sideOffset` and `arrow`, `TooltipKbd`). The content is a
  `<span popover="hint" role="tooltip">` (an unknown value is `manual`, so older engines still get a
  top-layer popover) linked by `aria-describedby`, or `aria-labelledby` with `asLabel` for icon-only
  buttons. Placement is CSS: the trigger's inline `anchor-name`, `position-area` per side and
  alignment, `position-try-fallbacks` to flip, an 8px inline margin to stay in the viewport and
  `position-visibility: anchors-visible`; JavaScript only reads the side CSS chose (`data-placed`)
  and the arrow offset (`--_arrow`), and places it itself where anchor positioning is missing. Opens
  on hover after the delay (instant inside the skip delay or while another shows; one at a time), on
  `:focus-visible` focus at once and on a tap (as the reference); closes on leave (100ms grace onto
  the label, WCAG 1.4.13), blur, Escape (cancelled, so a surrounding dialog stays), a press and
  window blur. `interestfor` with `interest-delay` before hydration. The label is `--popover` on the
  raised edge with a hairline ring, 12/16 medium, `--radius-control`, max 20rem; the arrow is a 10px
  turned square continuing the edge; key caps are CSS generated content with empty alt text so the
  name stays the words. Motion: `@starting-style` opacity 0 and scale 0.94 on the `unfold` spring
  from the placed side's arrow point; exit 100ms with `display` / `overlay` `allow-discrete`.
  Reduced motion keeps a 100ms fade; Motion off is instant.
- **Popover and Dropdown Menu** (no Figma frame yet): both are `popover="auto"` panels, so the top
  layer, light dismiss, Escape and stacking come from the browser, and the trigger is a native
  `popovertarget` invoker that works before hydration. CSS anchor positioning places them
  (`position-area` from `side` / `align`, `position-try-fallbacks` to flip; browsers without it get
  the centered UA popover). The panel is the overlay surface in `--popover` with the box radius, no
  cast shadow; it unfolds from the edge touching its trigger (`transform-origin` and a clip reveal,
  mirrored by `data-flip` when a fallback is used) on `--spring-unfold`, exits in 150ms with
  `display` / `overlay` `allow-discrete`, and fades only under reduced motion. The menu follows
  WAI-ARIA's menu button (roving focus, arrows, Home/End, typeahead, submenus on ArrowRight / hover,
  Escape back to the opener); one highlight glides between rows by `anchor()` (rows paint their own
  where `anchor-scope` is missing). `ContextMenu` reuses the menu, anchored to the pointer or, for
  Shift+F10, the focused element.
- **Toast** (Figma `7:238` not yet read): a Sonner-style stack. `Toaster` is a
  `<section popover="manual">` (top layer, no portal or z-index) that hides and re-shows itself when
  a dialog or popover opens so it stays on top; under a modal dialog it is visible but inert. A
  module store feeds it; `toast()` and `toast.success / error / warning / info / loading / promise /
  dismiss` add, update (same `id`) and dismiss; one Toaster per `id` renders (the first mounted).
  Toasts are `--popover` raised surfaces (`--radius-box`, no cast shadow); the icon chip tints
  `--success`, `--warning`, `--destructive` or `--primary` toward `--tint-ink`; actions are our
  Button (primary, ghost cancel). JS only measures heights and writes `--_i` / `--_offset` /
  `--_front-h`, `data-expanded` and swipe vars; CSS stacks (14px peek, 5% smaller, back ones cut to
  the front height), fans out, enters with `@starting-style` on the toast spring and exits with
  `display` `allow-discrete`. Timers pause on hover, focus, press and a hidden tab; polite and
  assertive live regions announce; F6 / Alt+T focus the newest, Escape dismisses the focused one.
- **Badge** (Figma `6:116`): 20px, 12/16 medium, a pale tint with colored text, six tones (neutral,
  accent, success, warning, danger, violet), optional 6px dot. Radius is its own tier,
  `--radius-badge`: 4px Default (Figma), 2px Sharp, fully round in Round. One `--_tone` color per
  class drives both the fill (12% of the tone over the surface, which reproduces Figma's tints) and
  the ink. **Deviation, tested:** Figma's raw tone text (for example `#f0803c` on `#fef0e6`) is
  2.7 to 3.9:1, below 4.5:1 for 12px text, so the ink is the tone mixed 75% toward black (toward
  white in dark). Measured: light 4.86 (warning) to 6.8, dark 5.07 to 6.6, asserted in
  `ui-badge.spec.ts`. Success, warning and violet reuse the same base color in dark; their dark
  values are not in Figma. Tag (outlined, `42:441`) and Chip (interactive, `6:139`) are separate.
- **Switch** (Figma Toggle `6:103` not yet read): a native `<input type="checkbox" role="switch">`
  with the HTML `switch` attribute (Safari 17.4+ treats it as a native switch; elsewhere it is
  ignored) and `appearance: none`. The input is the track and `::before` the thumb. Tracks 36x20,
  48x28 (default) and 56x32, thumb inset 3, 4 and 4px. Off track is `--muted-foreground` 70% over
  `--background` (60% measured 2.7:1 against the white thumb, so it was darkened to pass 3:1),
  on track `--primary`; thumb `--background` off and `--primary-foreground` on. Floating recesses
  the track (field edge and shade) and gives the thumb the surface ring and sheen; Flat drops both.
  Corners follow `--radius-button`. Motion: `:active` (switch or label) widens the thumb by 4px
  toward its destination and scales it to 0.9; `:checked` moves `inset-inline-start` across; all
  on the existing `switch` spring (800 / 80 / 4). Logical insets mirror it in RTL with no
  `:dir()` (Lightning CSS drops a nested `:dir()` rule). Disabled is 50% opacity and never moves.
  `Field` supplies the id, description and `aria-invalid` (red edge, soft halo). Space toggles; the
  checked state is native, so there is no `aria-checked`.
- **Select**: a native `<select>` that draws its own trigger (`rx-select`, inside an
  `rx-select-field` wrapper that holds the chevron and an optional leading icon), sizes 32, 40
  (default) and 48, the box radius tier, a 1px border that darkens on hover, the shared blue focus
  edge and halo, and the red error edge from Field. API: `Select` (`placeholder`, `leadingIcon`,
  `onValueChange`, everything a native select takes), `SelectItem` (an `<option>`, optional `icon`),
  `SelectGroup` (`<optgroup>`) and `SelectSeparator` (`<hr>`). The platform does the hard parts:
  keyboard, typeahead, form value, screen readers, phone pickers. Where `appearance: base-select`
  exists (Chromium) `select.css` draws the list (surface, border, 12px radius, 4px padding, 32px rows,
  muted hover and chosen fill, a tick on the chosen row, a soft cast shadow that Flat removes) and
  animates it in CSS only: the list unfolds from an 8px lip at the trigger's edge with a
  `clip-path` keyframe on the new `unfold` spring, pulls away into its 8px gap while its near
  corners round off, the trigger's facing corners pinch square and back, the rows fade down 4px,
  the chevron turns over (`:open`), and closing folds back in 200ms while `display` and `overlay`
  transitions keep the list rendered. JavaScript only sets `data-side` (below, or above when the
  list would not fit and there is more room) just before opening, so the motion starts from the
  right edge. Item icons render only after hydration and only where the styled list exists, so
  every browser hydrates the same options. Elsewhere the system list opens and the trigger looks
  the same. **Deviation from Figma:** the trigger follows the Button's look (surface fill, plain
  border, 32/40/48) instead of Input's recessed 28/32/36 field, and the Select ignores `data-depth`
  except for the list's shadow. Reconcile when the Figma design system is shared.
- **Checkbox** (Figma `6:59`, rebuilt 2026-11-01): a native `<input type="checkbox">`, invisible
  (`appearance: none`, opacity 0) and laid over a drawn box that reads its state with `:has()`
  (`:checked`, `:indeterminate`, `:disabled`, `:focus-visible`, `:active`, `aria-invalid`). The
  input is at least 24px, centered, so it is also the hit area. Sizes 16 (`sm`, Figma), 20 (`md`,
  default) and 24 (`lg`). Off is `--background` with a 2px `--muted-foreground` 50% edge (full on
  hover, only while empty); on and indeterminate fill `--primary` with a `--primary-foreground`
  glyph; disabled is 50% opacity; error (Field or `aria-invalid`) is a `--destructive` edge and 15%
  halo; focus the shared 2px ring. The tick and the dash are two inline SVGs with `pathLength="1"`:
  checking pops the glyph in (opacity, scale 0.5 to 1, 4px blur clearing, half the `check` spring)
  and draws the stroke with `stroke-dashoffset` 1 to 0 on the new `check` spring (784 / 56 / 1,
  critically damped, about 306ms) 40ms later; the dash draws a third quicker; unchecking fades,
  shrinks and blurs out in 160ms. Pressing the box or its label springs it to 0.92 on the press
  spring. Reduced motion keeps only a 100ms fade; Motion off is instant. API is shadcn's
  (`checked` incl. `"indeterminate"`, `defaultChecked`, `onCheckedChange`) plus `indeterminate`,
  `size` and `description`; children wrap it in a `<label>`, a description is linked with
  `aria-describedby` and the name comes from the label text alone. Radius is `--radius-check`
  (4px Default, 2px Sharp, 6px Round) scaled with the box (1, 1.25, 1.5). **Deviations from Figma:**
  20px default and the 2px muted edge (which also clears the 3:1 non-text contrast the old `--input`
  edge failed), a hover state, an error state and 50% disabled replace Figma's 16px box with the
  `#e3e3e3` edge and pressed-fill disabled. No CheckboxGroup: a list of checkboxes is a `fieldset`
  of Checkboxes; add a group when a design needs one. The Figma `Task Check` (6:78, a priority
  circle) is a separate component.
- **Radio Group** (Figma Radio `66:794` and Option Card `26:400` not yet read; built 2026-11-01):
  native `<input type="radio">`s sharing one `name` (generated with `useId` when left out) inside a
  `<fieldset role="radiogroup">`, so arrow keys, wrapping, skipping disabled options, the single tab
  stop and form submission are the browser's; `disabled` on the group is the fieldset's own. Each
  input is invisible over a drawn circle that reads it with `:has()`, at least 24px, like the
  Checkbox. Sizes 16 / 20 / 24 (set on the group; dot 6 / 8 / 10). Off is `--background` with a
  2px `--muted-foreground` 50% edge (full on hover); on is a `--primary` edge and dot (not a filled
  circle); error (Field or `aria-invalid` on the group) turns the circles `--destructive` with a 15%
  halo until something is chosen; disabled is 50%. Motion: where anchor positioning and
  `anchor-scope` exist the dot is the group's `::after`, anchored to the checked circle, and its
  `top` / `left` transition on the new `glide` spring (360 / 32 / 0.6, overdamped, about 420ms), so
  it travels to the new choice; elsewhere each circle's own `::after` pops in on the swap spring.
  Press springs the circle to 0.92. `variant="card"` draws choice cards (`--card` fill, `--input`
  edge, `--radius-control`, circle at the end; chosen is a `--primary` edge plus a 6% tint, with a
  card-level focus ring and a 0.985 press). The Field label now has an id (`<id>-label`) so a group
  is named by it with `aria-labelledby` (a `<label for>` cannot name a fieldset).
- **Tabs** (Figma Tab `7:202` and Segmented Control `66:846` not yet read): WAI-ARIA tabs with
  shadcn's API (`Tabs` with `value` / `defaultValue` / `onValueChange`, `orientation` and
  `activationMode`; `TabsList` with `variant` and `size`; `TabsTrigger` with `icon`; `TabsContent`).
  `<button role="tab">`s with `aria-selected` and `aria-controls`, one roving tab stop (the
  selected tab, or the first enabled one), arrows that wrap and skip disabled tabs (left and right
  swap in RTL; up and down when vertical), Home and End, automatic or manual activation. Panels stay
  mounted and `hidden`, focusable, labelled by their tab; `aria-controls` is dropped after
  hydration for a list with no panels. Variants: `segmented` (default; `--secondary` track with the
  recessed field edge, a `--card` thumb with the raised surface edge and ring), `pill` (a `--card`
  capsule track, `--primary` fill, the label's color on the same spring as the fill so it never
  sits light on the track), `underline` (a `--border` rule, a 2px `--primary` line) and
  `expandable` (icon tabs; the selected one's label opens in a `0fr` to `1fr` grid column on the
  swap spring and fades out of a 3px blur). Sizes 32, 40 and 48 like the Button; segmented follows
  `--radius-control`, pill and expandable `--radius-button`. Motion: `aria-selected` sets
  `anchor-name: --_tab`, the list sets `anchor-scope`, and the indicator (the list's last child,
  `position-anchor` plus four `anchor()` insets) transitions its insets on the `tabs` spring.
  Without `anchor-scope` (Chrome below 131, Safari below 26, Firefox below 147) the indicator is not
  drawn and the selected tab paints the same highlight on its `::before`; expandable always works
  that way. Panels enter from opacity 0, `blur(4px)` and 4px down via `@starting-style`; leaving is
  instant. Reduced motion keeps 100ms fades only; Motion off is instant. Open: the segmented thumb
  (`--card`) is close to its track in dark; the dark values are unconfirmed in Figma.
- **Slider** (no Figma section yet; built 2026-11-01): native `<input type="range">`s with
  `appearance: none`, so the slider role, keys (arrows, Page Up and Down, Home, End), forms and
  vertical layout (`writing-mode: vertical-lr; direction: rtl`) are the browser's. shadcn API
  (`value` / `defaultValue` / `onValueChange` as `number[]`, `onValueCommit` from the native
  `change` event, `min`, `max`, `step`, `minStepsBetweenThumbs`, `orientation`) plus `size` (track
  4 / 6 / 8, thumb 16 / 20 / 24), `showValue` (`true` or `"always"`), `formatValue`, `marks`,
  `thumbLabels` and `variant="ruler"`. JavaScript writes `--_lo` / `--_hi` / `--_p` (0 to 1) and
  CSS places everything at `thumb / 2 + (100% - thumb) * p`, the native thumb's path: one value
  paints the rail and `--primary` fill on its own runnable track; a range overlays one input per
  thumb (pointer events on the thumbs only, a shared track underneath), clamps each between its
  neighbours, names them "<label> Minimum" / "Maximum" and moves the nearest thumb on a bare-track
  press. The thumb (`--background`, 2px `--primary` edge, `--radius-button`) grows to 1.2 with a
  halo on the press spring (a `transform`: Chrome ignores `scale` on a range thumb); the bubble
  (`--foreground`) pops on the swap spring. Thumbs are pseudo-elements and cannot be anchors, so
  the bubble reads a variable. Marks are ticks under the rail, never under the thumb. Floating
  recesses the rail; Flat drops it and the thumb ring; Field errors turn the edges `--destructive`.
  Not built (need JS animation): velocity lean on the bubble, a momentum-scrolling ruler scale, a
  wave of bars and a thumb parting around inline labels.
- **Accordion and Collapsible** (no Figma section yet): both on native `<details>` / `<summary>`,
  so the button role, expanded state, Enter and Space, find-in-page and fragment opening come from
  the browser and they work before hydration. React holds the state; a press (or the browser
  opening one) is a request through `onOpenChange` / `onValueChange` and the element is put back if
  a controlled owner refuses. `Collapsible` (`open` / `defaultOpen` / `onOpenChange`, `disabled`,
  `CollapsibleTrigger` with a chevron, `CollapsibleContent`, `useCollapsible`) glides on `glide`
  both ways. `Accordion` is shadcn's API (`type` single or multiple, `value` / `defaultValue` /
  `onValueChange`, `collapsible`, `AccordionItem` / `Trigger` with `icon` / `Content` as a named
  `region`) built from Collapsibles; single gives the items one `name`. Up/down, Home and End move
  between triggers. Variants: `separated` (default, one joined stack; the open item lifts out with
  a 12px gap and its neighbours round their facing corners, all margins and radii from sibling
  selectors), `cards` and `flush`. Height is `::details-content` `block-size` 0 to `auto` with
  `interpolate-size`, a `0fr` to `1fr` grid row where that is missing; opening rides the new
  `expand` spring (117 / 14.7 / 1, the reference's 0.58s with 0.32 bounce, about 5% overshoot),
  closing glides; content rises 4px out of a 4px blur, the chevron turns on `swap`. Corners use
  `--radius-box`; surfaces the card edges, `--border` in Flat; no shadows.
- **Blocks** (`src/blocks/<name>`, exported as `@rabtx/ui/blocks/<name>`): whole screens composed
  only of the components, with a little CSS of their own (`src/styles/<name>-block.css`) for what is
  unique to them. They import component files by path (`../../input/input`, never a folder index),
  so the registry build rewrites each import to `@/components/ui/<file>` and adds that component as
  a registry dependency; the item is a `registry:block` whose files target
  `components/blocks/<name>/`. Blocks never call a network: they take callbacks (`onSubmit` and
  friends) and only wait a moment without them. First block, **Sign-up** (`signup-block`): a
  three-step card (details with a strength meter, an emailed code with a resend countdown, a drawn
  tick) on one native `<form>` validated by its own constraints and shown through Field, plus a
  compact `SigninBlock`. Steps enter with `@starting-style` and leave with a keyframe while the
  viewport eases to the measured height (`--_h`); the new step's heading takes focus and a live
  region names it. Docs at `/docs/ui/blocks/signup`, playground `/ui/blocks/signup`.
  **Command palette** (`command-block`): `CommandBlock` puts `CommandPanel` in a native Dialog
  behind a trigger and ⌘K / Ctrl+K (`shortcut`, `false` for a second palette). Commands are data
  (`id`, `label`, `group`, `icon`, `shortcut`, `badge`, `items` as an array or a loader,
  `onSelect`); the field is the Input as a `combobox` over a `listbox` with
  `aria-activedescendant`, fuzzy matching (runs and word starts) also searches pages below the
  first, Backspace or Escape steps back a page, recent ids are kept across openings. The highlight
  is the list's last child anchored to `[data-active]` (`anchor-scope`, unfold spring; the row
  fills itself without it) and the viewport eases to the measured `--_h` on the panel spring.
  Block CSS keeps the highlight's rules inside `@supports`, because the shadcn CLI merges every
  `@supports` block into the first one and a later base rule would win.
- **Settings block** (`settings-block`): Profile, Account, Notifications, Appearance and Danger
  zone on Tabs. The block is a size container: from 40rem of its own width the tab list is a
  sticky column beside the panels, below it a sideways-scrolling row, and the tabs'
  `aria-orientation` (so the arrow keys) is read back from that layout. The saved controls join
  one empty native `<form>` through their `form` attribute, so the Change email and Delete
  account Dialogs keep their own forms inside the cards. Dirty state is a diff against the last
  save; `data-dirty` on the form reveals the sticky bar via `:has()`, with `@starting-style` in and
  `display` `allow-discrete` out; tabs with changes or errors grow a dot, Save opens the first
  error's section, and focus moves to the open panel when the bar leaves. Destructive buttons are
  a block class over the Button's private variables (no Button variant added).
- Other frameworks: a Solid component is another thin wrapper over `button.styles.ts` plus the same
  CSS, not a clone or a rewrite. Not built yet; add it as a separate package or export with
  `solid-js` as a peer dependency, and test it with a real Solid render.
- Docs: `apps/web` at `/ui`, in the style of shadcn: one page per component with a short
  intro, a few important live examples (each one's source is read from its file, so it cannot
  drift), an API table and accessibility notes. A header toggle sets `data-theme`, `data-depth`,
  `data-radius` and `data-motion`. Add examples only when they teach something new. E2E:
  `apps/web/e2e/ui-button.spec.ts`. One component at a time; the owner picks the next. The
  Fumadocs site (`apps/docs`) has a UI section too (`content/docs/ui`), with the same live examples
  and their source for the components built so far (Button).
- Icons: HugeIcons is the target, but 44 files still import `lucide` and 93 import HugeIcons.
  Migrating the remaining lucide usage is part of the rebuild.
- Glass: the earlier web implementation was translucency plus backdrop blur and the native one was
  flat translucency; neither was liquid glass. On native the intended path is `expo-glass-effect`,
  already a mobile dependency, which hands the real system material to iOS instead of imitating it.
  The web has no equivalent system material, so it has to be approximated. Treat web and native
  results as the same material with different fidelity, and say which one you tested.
- Reference: `kargulstudio/sales-crm` (public, MIT) shows the depth technique and the app density we
  are targeting. Read it, do not copy its libraries.

## Layout Rules

- Use stable dimensions for toolbars, sidebars, tables, cards, and repeated controls.
- Do not let text overflow buttons, tabs, cards, table cells, or mobile headers.
- Do not place cards inside cards unless it is a true repeated item or modal body.
- Keep desktop workflows scannable and mobile workflows thumb-friendly.
- Use responsive constraints instead of viewport-scaled font sizes.

## Tokens

The shared Tailwind 4 design tokens live at `packages/ui/src/styles/globals.css` (shadcn monorepo style).

Current baseline:

- Background: `--background`
- Foreground: `--foreground`
- Primary: `--primary`
- Secondary: `--secondary`
- Muted: `--muted`
- Border: `--border`
- Ring: `--ring`
- Radius: `--radius`
- Charts: `--chart-1` through `--chart-5`
- Sidebar tokens: `--sidebar-*`

When adding a new app, do not invent one-off color systems. Extend the shared token package or
create an app-specific override with a short rationale.

## Typography

- Use the app's configured sans font for product UI.
- Reserve large display text for true first-viewport marketing or documentation hero sections.
- Use smaller, tighter headings inside dashboards, cards, sidebars, tables, and forms.
- Keep letter spacing at `0` unless a specific brand treatment requires otherwise.

## Components

The repo has a shared web primitive package at `packages/ui` and app-local primitives in
`apps/web/src/components/ui`.

Current rule (during the rebuild):

- Existing screens keep using `@starter/ui` until the matching `@rabtx/ui` component exists. Do not
  add new components or features to `@starter/ui`.
- New and rebuilt components go in `@rabtx/ui`, one at a time, following the Direction and
  Dependency policy above. Do not wrap or extend a shadcn component.
- When a component is rebuilt, switch its consumers over and delete the `@starter/ui` original in
  the same change.
- Keep complex or app-specific composed components inside each app or feature module.
- Promote a component to `packages/ui` only after it is reusable and free of route/auth/data
  coupling.
- Extend the existing `/rabtx` docs routes for visual review of the polished components.
- Add examples for loading, empty, error, disabled, hover, focus-visible, and selected states.

## AI UI Generation Rules

Before implementing UI, an agent should:

1. Read this `DESIGN.md`.
2. Read the target app's README and existing components.
3. Identify reusable components and tokens.
4. Ask for missing product context if the screen purpose is unclear.
5. Propose an implementation plan before editing.

After implementing UI, an agent should:

1. Run lint/typecheck/tests for the touched app.
2. Capture or inspect desktop and mobile rendering where possible.
3. Check long text, empty data, error states, and keyboard focus.
4. List any intentional differences from the design reference.

## Prompt Template

```txt
Use DESIGN.md and the existing app components as the source of truth.

Design/implement [screen/component].

Audience:
[who uses it]

Primary task:
[what the user must complete]

Domain constraints:
[data density, privacy, accessibility, workflow, device context]

Required states:
loading, empty, error, validation, hover, focus-visible, selected, disabled, saving, success

Quality bar:
No generic SaaS layout. No decorative blobs. No nested cards. Use shared tokens, stable spacing,
accessible contrast, responsive behavior, and existing component conventions.

Before coding, return:
1. Components to reuse.
2. New components needed.
3. Token changes if any.
4. Tests or visual checks to run.
```
