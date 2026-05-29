# ADR-0001: API key authentication, single user

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

The MCP server must authenticate to mite. mite offers two mechanisms: an API key
(`X-MiteApiKey` header, or `?api_key=` on GET) and HTTP Basic auth with email + password.
The server's purpose is to automate one person's own time reporting.

## Decision

Authenticate with an **API key** sent in the `X-MiteApiKey` header. Read credentials from the
environment: `MITE_ACCOUNT` (the subdomain) and `MITE_API_KEY`. The server operates as a
**single user** — the authenticated key owner. No per-request credentials, no account switching.

## Consequences

- Simple, stateless auth; the key can be revoked independently of the account password.
- The server is bound to one identity per process; multi-user/multi-account is explicitly out of
  scope and would need a new ADR.
- Credentials live in env (e.g. a per-repo `.mcp.json`), keeping them out of code and out of the
  defaults store.

## Alternatives considered

- **Email + password (Basic auth):** rejected. Stores a more sensitive secret, harder to revoke, no
  advantage over an API key for this use case.
- **Multi-account (token per request/session):** rejected for MVP. Adds switching complexity that the
  single-user goal does not need.
