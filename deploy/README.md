# Deploy

Production on one host: Docker Compose with Caddy (automatic HTTPS), the API, worker, console,
Postgres (pgvector) and a scheduled `pg_dump`. Runbooks: [docs/runbooks/](../docs/runbooks/README.md).

| File | What |
| --- | --- |
| `compose.yml` | the stack; only Caddy publishes ports (80, 443) |
| `Caddyfile` | TLS + routing: `CONSOLE_HOST` → console, `API_HOST` → API (one registrable domain, ADR-0007) |
| `backup/backup.sh` | `pg_dump -Fc` every `BACKUP_INTERVAL_SECONDS` into `BACKUP_DIR`, keeps `BACKUP_KEEP_DAYS` |
| `backup/restore.sh` | restores a dump into an empty database (or `--replace` one), prints row counts |
| `.env.example` | every setting; copy to `deploy/.env` (gitignored), real values from Doppler `synapse/prd` |

```bash
cp deploy/.env.example deploy/.env      # fill in, or: doppler secrets download --config prd --no-file --format env > deploy/.env
docker compose -f deploy/compose.yml --env-file deploy/.env up -d --build
docker compose -f deploy/compose.yml --env-file deploy/.env ps
```

The API applies migrations on start (advisory lock) and reports healthy only when the database
answers (`/api/v1/health/ready`); the worker, backup job and Caddy wait for that.

## Building behind a TLS-inspecting proxy

Corporate proxies and agent sandboxes re-sign TLS, so `bun install` inside the build needs the
proxy's CA. Set `BUILD_CA_FILE` to it (passed as the optional `build_ca` BuildKit secret; unset, the
build is unchanged) and, if the proxy listens on the host's loopback, `BUILD_NETWORK=host`. Compose
v5 builds through Buildx bake, which asks to allow both; from `deploy/`:

```bash
set -a; . ./.env; set +a
docker buildx bake -f compose.yml --allow=fs.read=.. --allow=network.host \
  --allow=fs.read="$BUILD_CA_FILE" --load api worker console
docker compose -f compose.yml --env-file .env up -d --no-build
```

## Verified (syn-041)

In an agent sandbox with `CONSOLE_HOST=console.localhost`, `API_HOST=api.localhost` (Caddy's local
CA): the three images build; all six services start and the API, console and Postgres report
healthy; through Caddy: HTTP/2, HTTP → HTTPS (308), HSTS / nosniff / referrer headers, `Server`
removed; sign-up returns `201` with CORS for the console origin only and the refresh cookie
`HttpOnly; Secure; SameSite=Strict`; migrations run on start and are a no-op on restart; the
worker runs its jobs; a dump restores into a fresh database with identical row counts, an
identical 1536-dimension vector and its HNSW index; a `--replace` restore over the live database
(services stopped) brings the stack back healthy. Not verified here: Let's Encrypt certificates
(needs a public DNS name) and real email and model calls (dummy keys).
