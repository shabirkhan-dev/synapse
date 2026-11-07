# `@synapse/security`

Who you are and what you may do: authentication, authorization, tenancy, permissions, PII and secrets.

> **Status:** Partly live: HS256 JWT verification in `apps/api/src/modules/auth`. No issuer yet.

## Internal modules

`authentication/ authorization/ tenancy/ permissions/ pii/ secrets/`

## Owns

- Token issuing and verification
- Authorization and permission checks
- Tenant isolation
- PII detection and redaction
- Secret handling

## Does not own

- Content policies (→ `guardrails`)

## Depends on

`core`

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.
