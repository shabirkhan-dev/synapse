# Starter scripts

Scripts live under **`scripts/`** at repo root, organized by purpose: **bash** utilities, **architecture** checks and **git-hooks**.

## Layout

```
scripts/
├── bash/           # Bash – ShellCheck, shfmt
│   ├── main.sh
│   ├── .shellcheckrc
│   └── tests/
├── architecture/   # Boundary and kebab-case naming checks
├── git-hooks/      # Scripts run by lefthook
└── README.md       # This file
```

## Commands (from root)

| Command | Purpose |
|---------|---------|
| `bun run scripts:lint` | Lint bash (ShellCheck) |
| `bun run scripts:format` | Format bash (shfmt) |
| `bun run scripts:run` | Run bash main script (same as `scripts:run:bash`) |
| `bun run scripts:run:bash` | Run `scripts/bash/main.sh` |
| `bun run test:scripts` | Run the bash script tests |

## Prerequisites

- **Bash** – for `scripts/bash`

Optional (for lint/format):

- Bash: **ShellCheck**, **shfmt** (e.g. `pacman -S shellcheck shfmt`)

## QoL / goodies

- **bash** – `.shellcheckrc`, shfmt 4-space indent.
