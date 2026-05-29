# CONTEXT — mite-mcp

## What this is

An MCP server that wraps the [mite.de](https://mite.de/en/api/) REST API so an agent can automate
**time reporting**. The first slice is scoped to time reporting (create/read/update/delete time
entries, grouped reports, the running timer, and name resolution), not full API coverage.

This server is an **anti-corruption layer**, not a domain model: mite owns the business rules; we
provide a thin, agent-friendly adapter. See [ADR-0002](docs/adr/0002-acl-not-ddd.md).

## Glossary (ubiquitous language)

Use these terms exactly in tool names, issues, tests, and code. Where our term differs from mite's,
the mite mapping is noted.

| Term | Meaning |
|------|---------|
| **Account** | A mite tenant, addressed as `{account}.mite.de`. Identified by `MITE_ACCOUNT`. |
| **Time entry** | A logged unit of work: minutes on a date, optionally tied to a project + service, with a note. mite resource `time_entry`. |
| **Project** | A unit of client work. Belongs to a customer. mite resource `project`. |
| **Customer** | The client a project belongs to. Derivable from the project. mite resource `customer`. |
| **Service** | The *kind* of work performed (e.g. Development, Design) — orthogonal to project. mite resource `service`. Not to be confused with the colloquial "usługa". |
| **User** | A member of the account. The authenticated user is resolved via `/myself.json`. |
| **Tracker** | The single running timer per user. Started/stopped against an existing time entry. |
| **Locked** | An entry an admin has frozen; edits/deletes return `423` and are refused without `force` (out of scope). |
| **Billable** | Whether a time entry counts toward billable revenue. |
| **Revenue** | Money value of entries, computed by mite from rates. We report it, never compute it. |
| **Grouping (report)** | Server-side aggregation via `group_by` (project/customer/service/user/day/week/month/year). The only sanctioned way to total time. See [ADR-0003](docs/adr/0003-minutes-canonical-hours-convenience.md). |
| **Scope** | The key binding a context (a repo) to default project/service. Derived from environment, never authored by the agent. See [ADR-0005](docs/adr/0005-per-repo-scope-defaults.md). |
| **Default** | The `{project_id, service_id}` stored for a scope, so the dominant create flow needs no IDs. |

## Conventions

- **Time** is canonically **minutes** (as in mite). Tools accept `hours` as a convenience and convert.
- **Dates** use mite keywords (`today`, `this_month`, …) or `YYYY-MM-DD`. "Today" is expressed by
  *omitting* the date, not by computing it client-side.
- **Write safety** is risk-tiered: reversible ops act immediately, destructive ops are dry-run by
  default. See [ADR-0004](docs/adr/0004-create-immediate-other-writes-dry-run.md).

## Decisions

See `docs/adr/` for the architecture decision records.
