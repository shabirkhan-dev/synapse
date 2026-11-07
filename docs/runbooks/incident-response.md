# Incident response

> **Status:** Placeholder — needs on-call owners and a production environment.

Template:

1. **Detect** — alert or report; note the time and the `x-request-id` if you have one.
2. **Assess** — which component (api, worker, Postgres, model provider)? Check `/health/ready`.
3. **Mitigate** — roll back, switch model provider (fallback), or disable the failing feature.
4. **Communicate** — status to stakeholders.
5. **Resolve and review** — root cause, write-up, follow-up cards.

To decide: severity levels, on-call rotation, status page, escalation contacts.
