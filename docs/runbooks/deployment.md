# Deployment

> **Status:** Live (single host, `deploy/compose.yml`) · Live — CD builds and pushes images to GHCR
> (`.github/workflows/cd.yml`, syn-052) · Planned — the SSH deploy runs once the host secrets below
> are set (tested against a local registry, not yet against a real host).

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

## Continuous deployment (syn-052)

`.github/workflows/cd.yml` runs on every push to `main` and every `v*` tag:

| Trigger | Images (`ghcr.io/<owner>/synapse/{api,worker,console}`) | Deploys to |
| --- | --- | --- |
| push to `main` | `sha-<12 chars>`, `main` | GitHub environment `staging` |
| tag `v1.2.3` | `1.2.3`, `latest` | GitHub environment `production` |

Images are pushed with the job's own `GITHUB_TOKEN` (no registry secret). The console inlines the
API URL at build time, so it needs the **repository variable** `API_HOST`; until it is set, `main`
skips the console image with a notice and a release fails.

**Set up a deploy target** (once per environment, in GitHub → Settings → Environments):

| Kind | Name | Value |
| --- | --- | --- |
| variable | `DEPLOY_HOST` | the host's DNS name or IP |
| variable | `DEPLOY_USER` | SSH user (default `deploy`, in the `docker` group) |
| variable | `DEPLOY_PATH` | where the repo is cloned on the host (default `/srv/synapse`) |
| variable | `API_HOST` | the public API host, for the readiness check |
| secret | `DEPLOY_SSH_KEY` | a private key whose public half is in the user's `authorized_keys` |
| secret | `DEPLOY_KNOWN_HOSTS` | `ssh-keyscan <host>` output, checked (no trust on first use) |

The host needs the repo cloned at `DEPLOY_PATH` with `deploy/.env` filled in ([First deploy](#first-deploy)).
Without these the deploy job succeeds with "Deploy skipped: not configured" in its summary.

A deploy (`deploy/ci-deploy.sh` in CI → `deploy/remote-deploy.sh` on the host) logs the host in to
GHCR with the job's token (logged out after), checks out the commit or tag, runs
`docker compose pull` and `up -d --no-build --wait` (returns once every health check passes), then
CI polls `https://$API_HOST/api/v1/health/ready`.

**Roll back** to an earlier release on the host (images stay in GHCR):

```bash
docker login ghcr.io            # a token with read:packages, if the images are private
deploy/remote-deploy.sh v1.2.2 1.2.2 ghcr.io/<owner>/synapse
```

## Upgrade by hand

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
