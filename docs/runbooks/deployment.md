# Deployment

> **Status:** Live (single host, `deploy/compose.yml`) · Placeholder — CD (`.github/workflows/cd.yml`)
> still has empty deploy steps; deploys are run by hand on the host.

Production is one Linux host running [deploy/compose.yml](../../deploy/README.md): Caddy (HTTPS),
API, worker, console, Postgres (pgvector) and a daily `pg_dump`.

## First deploy

1. **Host:** Docker Engine with Compose v2.20+; ports 80 and 443 open; everything else closed.
2. **DNS:** `console.<domain>` and `api.<domain>` → the host (A/AAAA). Both on one registrable domain:
   the API's `SameSite=Strict` refresh cookie needs the console on the same site (ADR-0007).
3. **Code:** `git clone` the repo (or check out a release tag `v*`).
4. **Settings:** `deploy/.env` from Doppler `synapse/prd`
   (`doppler secrets download --config prd --no-file --format env > deploy/.env`) or from
   `deploy/.env.example`. Required: hosts, `ACME_EMAIL`, `POSTGRES_PASSWORD`, `JWT_SECRET`
   (`openssl rand -base64 48`), `RESEND_API_KEY` (sender domain verified in Resend), a model key.
5. **Start:** `docker compose -f deploy/compose.yml --env-file deploy/.env up -d --build`
6. **Check:** `docker compose -f deploy/compose.yml --env-file deploy/.env ps` shows `api`,
   `console`, `postgres` healthy; `curl https://api.<domain>/api/v1/health/ready` says
   `"database":"ok"`; sign up in the console and open the emailed verification link.

## Upgrade

```bash
git fetch --tags && git checkout v1.2.3          # or git pull on main for staging
docker compose -f deploy/compose.yml --env-file deploy/.env up -d --build
```

Migrations run when the new API starts (one at a time, under an advisory lock) and are written to
be safe for the old version still running (expand → migrate → contract, `.agents/rules/database.md`),
so the short API restart is the only interruption. Take a backup first for risky releases:
`docker compose … exec backup /backup/backup.sh --once`.

## Roll back

Check out the previous tag and run the same `up -d --build`. Migrations are never rolled back
automatically: a release that changed the schema stays compatible with the previous code by the
expand/contract rule. If data must go back, restore a backup ([database-recovery.md](database-recovery.md)).

## Building behind a proxy

See [deploy/README.md](../../deploy/README.md#building-behind-a-tls-inspecting-proxy) (`BUILD_CA_FILE`, `BUILD_NETWORK`).
