# Deployment

> **Status:** Placeholder — no hosting target chosen. `.github/workflows/cd.yml` runs the quality
> gate (`bun run preflight`) and has empty staging/production deploy steps.

Known pieces:

- Images: `apps/api/Dockerfile` (Bun, migrations on start when `RUN_MIGRATIONS=true`),
  `apps/console/Dockerfile` (Next.js standalone on Node).
- Staging deploys on push to `main`; production on `v*` tags (per `cd.yml`).

To decide: host, secrets management, migration strategy for rolling deploys, rollback steps.
