# Contributing to Synapse

Thanks for helping. Bug reports, fixes, docs and features are all welcome.

## Before you start

- **Bugs and ideas:** open an issue with the [templates](.github/ISSUE_TEMPLATE/). For a larger
  change, describe it in an issue first so we can agree on the approach.
- **Security problems:** do not open a public issue; see [SECURITY.md](SECURITY.md).

## Set up

Follow [Try it locally](README.md#try-it-locally), then install the git hooks:

```bash
bun run prepare
```

## Make a change

1. Branch from `main`.
2. Keep the change small and complete: code, tests and docs together. Every behaviour change ships
   with a test (`bun test` per package; browser flows in `tests/e2e`).
3. Follow the project rules: [AGENTS.md](AGENTS.md) and [docs/development/](docs/development/README.md)
   cover the layering (routes → services → repositories; pages → containers → hooks → services),
   naming, and the one-owner-per-capability rule. `bun run architecture:check` enforces most of it.
4. Run the checks before pushing:

   ```bash
   bun run format
   bun run preflight            # lint + typecheck + tests
   bun run architecture:check
   ```

5. Commit with [Conventional Commits](https://www.conventionalcommits.org/), all lowercase:
   `fix(chat): keep the scope when regenerating`. The commit-msg hook checks it.
6. Open a pull request with the [template](.github/PULL_REQUEST_TEMPLATE.md). CI must be green.

Decisions that are hard to reverse get an ADR in [docs/decisions/](docs/decisions/README.md).

## License

By contributing you agree that your contributions are dual-licensed under
[MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-Apache-2.0), like the rest of the project.

## Conduct

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
