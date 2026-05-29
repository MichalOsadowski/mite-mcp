# ADR-0005: Per-repo defaults with environment-derived scope

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

For the dominant create flow, naming the project/service every time is friction. We want to bind a
working context to a default project + service. The hard problem is the **key**: if the agent (an
LLM) authors the scope string, it drifts ("acme-web" today, "Acme" tomorrow), orphaning defaults so
they never apply.

## Decision

- Persist defaults in `~/.config/mite-mcp/defaults.json`, shaped as
  `{ "scopes": { "<key>": { "project_id, "service_id" } } }`. Store only project + service; the
  customer is derivable from the project. Writes are **atomic** (write-temp-then-rename) because
  multiple server processes may share the file.
- Resolve `scope` from the **environment, never from the LLM**, by this priority chain:
  1. explicit `scope` argument (the bridge to a future global mode — **not built now**);
  2. `MITE_DEFAULT_SCOPE` env var (set in the repo's `.mcp.json`);
  3. normalized git remote URL of the repo → fallback: repo root path;
  4. none → return a structured "no default; existing scopes: …; set via `set_default`".
- The server is designed to run **per repo** (project-scoped `.mcp.json`), where step 2/3 are reliable
  and the agent omits `scope` entirely → no drift.
- `create_time_entry` with omitted IDs pulls from the default and **returns the resolved names** in its
  response; that returned line is the confirmation, with no server-side confirmation state.

## Consequences

- Defaults reliably apply because the key is deterministic, not model-authored.
- The server is stateful (one small JSON file) — an accepted trade for the ergonomics.
- A future global mode (one shared server, agent supplies `scope`) is reachable via step 1 without
  changing the contract; it carries known key-drift risk and would be its own ADR when built.

## Alternatives considered

- **Agent-authored scope string:** rejected — drifts and orphans defaults.
- **Defaults in the agent/client layer (CLAUDE.md/memory):** rejected — ties the convenience to one
  MCP client; not portable.
- **mite bookmarks:** rejected — they are saved _read_ filters, not creation defaults.
- **Single global active default (no key):** rejected — one slot can't serve multiple repos.
