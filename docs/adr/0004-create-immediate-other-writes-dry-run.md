# ADR-0004: Risk-tiered write safety (create immediate, update/delete dry-run)

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

Creating time entries is the dominant operation, so it must be low-friction. But the end goal is
*unattended* automation, and some writes are destructive. A blanket dry-run on every write would add
friction exactly where we want flow; no guardrails at all would make destructive mistakes easy.

## Decision

Tier write safety by reversibility:

- **Reversible ops act immediately:** `create_time_entry` and tracker `start`/`stop`. A wrong create
  is cheap to fix; `stop` is idempotent. `preview:true` is available on demand but off by default.
- **Destructive ops are dry-run by default:** `update_time_entry` (can clobber) and
  `delete_time_entry`. They return a preview unless called with `confirm:true`.
- `confirm` / `preview` are **per-call parameters**, not server-side state. An automating agent passes
  `confirm:true` to run unattended; there is no "awaiting confirmation" state that could deadlock.
- The MCP client's own tool-approval prompt remains a second safety layer for all writes.

## Consequences

- The dominant path (create) is single-call and fast.
- Destructive actions require an explicit, auditable opt-in.
- Unattended automation stays possible because confirmation is caller-controlled, not stored.

## Alternatives considered

- **Dry-run on all writes (incl. create):** rejected — doubles every create into preview+confirm.
- **Server-side confirmation state:** rejected — would deadlock unattended runs.
