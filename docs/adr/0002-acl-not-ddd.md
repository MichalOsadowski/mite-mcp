# ADR-0002: Anti-corruption layer, not a domain model

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

The original idea was to produce "DDD docs" for the project. mite's API, however, is a thin CRUD
REST surface. The business rules, invariants, and aggregates live on mite's servers — we do not own
that domain. The risk is over-engineering: modeling entities, value objects, and domain events for
what is fundamentally a client adapter.

## Decision

Treat this server as an **anti-corruption layer (ACL) / client adapter**, not a domain model. We:

- Wrap mite resources behind a thin `MiteClient` and a small set of tools.
- Document the **ubiquitous language** in `CONTEXT.md` and record decisions as ADRs — the lightweight,
  useful parts of DDD — without building aggregates/entities/domain-event machinery.
- Keep the layering rule: tools talk to `MiteClient`; `MiteClient` knows nothing about MCP.

## Consequences

- Less ceremony; the codebase stays proportional to the problem (a CRUD wrapper).
- Future contributors (human or agent) have an explicit signal **not** to introduce domain-model
  abstractions where an adapter suffices.
- If real owned domain logic ever emerges (e.g. complex local scheduling rules), this ADR should be
  revisited/superseded.

## Alternatives considered

- **Full DDD modeling:** rejected. Produces ceremony with no payoff for a passthrough over someone
  else's domain.
