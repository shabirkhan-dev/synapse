# Rotate secrets

> **Status:** Live (single host, `deploy/compose.yml`).

Change the value in Doppler `synapse/prd`, update `deploy/.env`, then restart what reads it:
`docker compose -f deploy/compose.yml --env-file deploy/.env up -d <services>`.

| Secret | Restart | Effect on users |
| --- | --- | --- |
| `JWT_SECRET` | `api` | Access tokens signed with the old secret stop verifying at once; the console refreshes (refresh tokens are database rows, not JWTs), so people stay signed in |
| `POSTGRES_PASSWORD` | first `ALTER USER synapse PASSWORD '…'` in Postgres, then `api worker backup` | none; the `postgres` container keeps its data (the variable only seeds a new volume) |
| `RESEND_API_KEY` | `api` | none; emails during the restart are retried |
| `AI_API_KEY` / vendor keys | `api worker` | none; requests in flight during the restart fail and can be retried |
| `LANGFUSE_*` | `api` | traces resume with the new keys |

To end every session (suspected token theft): `update auth_sessions set revoked_at = now() where
revoked_at is null;` — everyone signs in again within 15 minutes (access token lifetime).
