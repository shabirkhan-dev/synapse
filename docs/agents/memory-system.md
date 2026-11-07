# Memory system

> **Status:** Live.

`.agent/memory/` holds durable facts agents should know without rediscovering them:

| File | Holds |
| --- | --- |
| `architecture.md` | What exists now vs. what is planned |
| `decisions.md` | Decisions made, with links to ADRs |
| `conventions.md` | Names, ports, paths, commands |
| `known-constraints.md` | Gotchas that are true today |

Rules: keep entries short and true; delete an entry when it stops being true; anything that needs
explanation goes to `docs/` and is linked. Memory is updated in the same change that makes it
true or false.
