# Rule: TypeScript

- `strict` everywhere (`packages/typescript-config/base.json`). Do not loosen it per package.
- No `any`. Use `unknown` and narrow, or a precise type.
- Validate at the edge with **Zod**; infer types from schemas (`z.infer`) instead of writing them
  twice. Inside the system, trust the types.
- Prefer `type` imports (`import type { X }`) for type-only symbols.
- Public package APIs have explicit return types.
- Model failure explicitly: throw a typed error (`AppError` in the API, `core/errors` later) or
  return a result type. Never swallow errors.
- Prefer discriminated unions over boolean flags for state.
- `noUncheckedIndexedAccess` is on in `apps/api`; handle the `undefined`.
