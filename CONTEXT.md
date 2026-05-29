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

| Term                  | Meaning                                                                                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Account**           | A mite tenant, addressed as `{account}.mite.de`. Identified by `MITE_ACCOUNT`.                                                                                                                           |
| **Time entry**        | A logged unit of work: minutes on a date, optionally tied to a project + service, with a note. mite resource `time_entry`.                                                                               |
| **Project**           | A unit of client work. Belongs to a customer. mite resource `project`.                                                                                                                                   |
| **Customer**          | The client a project belongs to. Derivable from the project. mite resource `customer`.                                                                                                                   |
| **Service**           | The _kind_ of work performed (e.g. Development, Design) — orthogonal to project. mite resource `service`. Not to be confused with the colloquial "usługa".                                               |
| **User**              | A member of the account. The authenticated user is resolved via `/myself.json`.                                                                                                                          |
| **Tracker**           | The single running timer per user. Started/stopped against an existing time entry.                                                                                                                       |
| **Locked**            | An entry an admin has frozen; edits/deletes return `423` and are refused without `force` (out of scope).                                                                                                 |
| **Billable**          | Whether a time entry counts toward billable revenue.                                                                                                                                                     |
| **Revenue**           | Money value of entries, computed by mite from rates. We report it, never compute it.                                                                                                                     |
| **Grouping (report)** | Server-side aggregation via `group_by` (project/customer/service/user/day/week/month/year). The only sanctioned way to total time. See [ADR-0003](docs/adr/0003-minutes-canonical-hours-convenience.md). |
| **Scope**             | The key binding a context (a repo) to default project/service. Derived from environment, never authored by the agent. See [ADR-0005](docs/adr/0005-per-repo-scope-defaults.md).                          |
| **Default**           | The `{project_id, service_id}` stored for a scope, so the dominant create flow needs no IDs.                                                                                                             |

## Conventions

- **Time** is canonically **minutes** (as in mite). Tools accept `hours` as a convenience and convert.
- **Dates** use mite keywords (`today`, `this_month`, …) or `YYYY-MM-DD`. "Today" is expressed by
  _omitting_ the date, not by computing it client-side.
- **Write safety** is risk-tiered: reversible ops act immediately, destructive ops are dry-run by
  default. See [ADR-0004](docs/adr/0004-create-immediate-other-writes-dry-run.md).

## Architecture

A shared kernel first; resource tools sit on top of it. Each module has one clear purpose.

```
src/
  mite/
    client.ts     # fetch, auth, pagination, error mapping (401/404/422/423/5xx)
    schemas.ts    # zod: mite resources + tool inputs
    format.ts     # response shaping, minutes<->hours, dates
    defaults.ts   # per-scope defaults store (JSON file, atomic write) + scope resolution
  tools/
    types.ts        # the tool seam: ToolDefinition (name, inputSchema, pure run) + ToolDeps
    whoami/         # a loner tool — its own directory
      whoami.tool.ts
      whoami.test.ts
      index.ts             # export const tools = [whoamiTool]
    time-entries/   # a module: tools that share the entry schema + hours<->minutes coercion
      list-time-entries.tool.ts   # one tool per file; <name>.tool.ts, test beside it
      list-time-entries.test.ts
      create-time-entry.tool.ts   # …get / update / delete alongside
      entry.ts                    # the shared mechanism, in one place (no .tool.ts)
      index.ts                    # export const tools = [...the module's tools]
    tracker/        # module: get / start / stop (share the running-timer state)
    lookup/         # module: find_project / find_service / find_customer (share name->id lookup)
    defaults/       # module: set_default / get_default / clear_default / list_defaults
    index.ts        # the registry: spreads each directory's tools array
    register.ts     # the one MCP-aware adapter: loop the registry, shape each run into an MCP result
  index.ts          # server bootstrap (thin)
```

**Layering rule:** `tools/*` never call `fetch` directly — only via `MiteClient`, which knows nothing
about MCP. Tools are MCP-agnostic too: a tool is a `ToolDefinition` whose `run` returns plain data, and
only `register.ts` imports the MCP SDK or shapes a `content`/`isError` result. This keeps both the client
and the tools testable against mocks, with error→result shaping living in one place.

**Tool organization:** a directory per concept, tool and test co-located. One tool per `<name>.tool.ts`
file (kebab-case of the tool's snake_case name: `list_time_entries` → `list-time-entries.tool.ts`); each
directory's `index.ts` exports its `tools` array, and the registry spreads them. Tools share a directory
**only when they share a mechanism**, which lives in one co-located helper file; a tool that shares
nothing is a single-tool directory. See [ADR-0006](docs/adr/0006-tool-definitions-and-grouping.md).

The authoritative reference for the upstream API is mite's own docs: <https://mite.de/en/api/>.
We do not snapshot endpoint shapes here — they live in mite's docs and are cited per issue where needed.

## Decisions

See `docs/adr/` for the architecture decision records.
