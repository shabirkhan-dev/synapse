# Security policy

## Reporting a vulnerability

Please report security problems **privately**, not in a public issue: use
[GitHub's private vulnerability reporting](https://github.com/shabirkhan-dev/synapse/security/advisories/new)
("Report a vulnerability" on the Security tab).

Include what you found, how to reproduce it and what an attacker could do. We aim to acknowledge a
report within three business days and to agree a disclosure date with you once a fix is ready.

## Supported versions

Fixes land on `main` and in the next release. Run a recent release or `main`.

## Scope

In scope: the API, console, worker, deploy configuration and anything in this repository.
Out of scope: issues in third-party services (model providers, Resend, your identity provider)
and deployments that turn off the production checks (for example development secrets or
`*_ALLOW_PRIVATE_NETWORKS=true`).

How Synapse handles authentication, tenancy, secrets and untrusted model input is described in
[docs/architecture/](docs/architecture/README.md) and the ADRs in [docs/decisions/](docs/decisions/README.md).
