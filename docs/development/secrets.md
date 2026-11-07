# Secrets (Doppler)

How every machine gets the same keys and settings without copying `.env` files around.

> **Status:** Live (local machines and agent sessions via `bun run env:pull` / `env:push`) ·
> Planned (CI and production read Doppler directly).

**Doppler is the source of truth** for the root `.env` (project `synapse`; configs `dev`, `stg`,
`prd`). `.env` stays gitignored and is only a local copy. `.env.example` stays the documented list
of every variable with safe defaults.

## New machine (once)

```bash
# 1. Install the CLI: https://docs.doppler.com/docs/install-cli
brew install dopplerhq/cli/doppler          # macOS; Linux/Windows: see the link
# 2. Sign in (opens the browser) and link this folder to project synapse / config dev (doppler.yaml)
doppler login
doppler setup --no-interactive
# 3. Write .env from Doppler
bun run env:pull
```

Then run as usual (`bun run dev`, `docker compose up -d --build`); everything reads the root `.env`.

## Day to day

| Task | Command |
| --- | --- |
| Get the latest values | `bun run env:pull` (old file kept as `.env.backup`) |
| Add or change a value | `doppler secrets set NAME=value`, then `bun run env:pull` (or edit in the dashboard) |
| Push a locally edited `.env` | `bun run env:push` (adds and updates keys; never deletes) |
| Run without writing a file | `doppler run -- bun run dev` |
| See what is stored | `doppler secrets` |

## Configs

| Config | Used by | Rule |
| --- | --- | --- |
| `dev` | your machines, agent sessions | development values; may use test keys |
| `stg` | staging deploy (later) | own keys |
| `prd` | production deploy (later) | strong `JWT_SECRET`, real `RESEND_API_KEY`, `NODE_ENV=production` |

Machine-specific values (e.g. a different `DATABASE_URL`) go in a personal branch config
(`dev_<name>`, `doppler setup` → choose it) instead of changing `dev` for everyone.

## Agent sessions (Claude Code on the web)

The session reaches Doppler with a **service token** for `synapse/dev` (read/write), stored in the
cloud environment as a network secret for `api.doppler.com`. The token is never in the repo or a
file: the network proxy adds it to requests, so the CLI runs with a placeholder
(`DOPPLER_TOKEN=dp.st.dev.placeholder doppler secrets download ...`).

## Rules

- Never commit `.env`, `.env.backup` or tokens (gitignored; the pre-commit hook scans for secrets).
- A new variable is added to `.env.example` (documented default) **and** to Doppler `dev`.
- Rotate a key in Doppler, then `bun run env:pull` everywhere; no code change.
