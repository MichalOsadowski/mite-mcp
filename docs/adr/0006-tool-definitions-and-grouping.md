# ADR-0006: Tool definitions, a central registry, and grouping by shared mechanism

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

The server exposes its capabilities as MCP tools. The first slice ([#2](https://github.com/MichalOsadowski/mite-mcp/issues/2))
shipped two tools (`ping`, `whoami`) with each tool's MCP wiring — title, input schema, the
try/catch that turns a result or error into a `content`/`isError` payload — written inline in
`register.ts`. That glue is identical for every tool, so as the time-reporting tools land
(`list_time_entries`, `create_time_entry`, the tracker, the `find_*` lookups, the defaults), three
things would worsen: `register.ts` accumulates a registration block per tool; the error→result
shaping gets copied per handler; and the MCP SDK types spread into every tool file, so tools can no
longer be read or tested without MCP in the picture.

A separate question is how tool code is laid out on disk. The earlier sketch grouped tools by
**category** (`resolve.ts` = `whoami` + the `find_*` tools), but those tools share no implementation —
grouping by label produces junk-drawer files. One-file-per-tool is findable but tears apart tools that
genuinely _do_ share a mechanism (the `time_entries` CRUD share an entry schema; the `find_*` tools
share a name→id lookup), forcing that mechanism into a global helper or duplicating it.

This is the agent-facing adapter surface of the anti-corruption layer (see [ADR-0002](0002-acl-not-ddd.md)):
mite owns the rules; tools are a thin, uniform way to expose them.

## Decision

- **A tool is a `ToolDefinition`** — plain data: `{ name, title, description, inputSchema, run }`. It
  imports no MCP. `run(input, deps)` returns a value; it never builds a `content`/`isError` result.
- **One MCP-aware adapter.** `register.ts` is the only file that imports the MCP SDK. It loops the
  registry and wraps each `run` in a single `toHandler` that shapes the return value (string → text
  verbatim; otherwise pretty JSON), maps `MiteApiError` to its non-leaky message, and sets `isError`
  on any throw.
- **A directory per concept; tool and test co-located.** Every tool lives in a directory under
  `tools/` — a loner is its own directory (`tools/whoami/`); tools that share a mechanism share one
  directory (`tools/time-entries/`). The tool file carries a `.tool.ts` suffix and its test sits beside
  it. This keeps `tools/` a scannable list of concepts and visually separates tool files from helpers.
- **Each directory's `index.ts` exports its tool array** (`export const tools = [...]`), not a bare
  re-export — the barrel concentrates "what this directory exposes" and earns its place by the deletion
  test. The central registry `tools/index.ts` assembles the whole set by spreading each directory's
  array, so it changes only when a _directory_ is added, never per tool.
- **Dependencies are passed, resolved lazily.** The adapter hands `run` a `ToolDeps` whose
  `getClient()` is only called by tools that need mite — so credential-free tools (`ping`) keep the
  server starting without credentials.
- **Group by shared mechanism; split when there is none.** Tools share a directory only when they
  share an interface/implementation, and that shared mechanism lives in one co-located file (no
  `.tool.ts` suffix, so it reads as a helper). A tool that shares nothing is a single-tool directory.
- **Naming.** One tool per file: `<name>.tool.ts`, where `<name>` is the kebab-case of the tool's
  snake_case MCP name (`list_time_entries` → `list-time-entries.tool.ts`); its test is
  `<name>.test.ts`. Directories are kebab-case (`time-entries/`). Single-word kernel files
  (`client.ts`, `schemas.ts`) are unaffected.

## Consequences

- `register.ts` stops growing with tool count; error→result shaping has one home (locality).
- Tools are testable and readable without the MCP SDK; the adapter is tested once, generically.
- Shared mechanism stays local to its module — the deletion test passes: removing one tool file
  leaves the shared file and its siblings intact.
- Filename ↔ tool-name mapping makes a tool trivial to locate (modulo the snake/kebab separator).
- This **supersedes** the category grouping (`resolve.ts` = misc reads) the architecture section
  previously documented.

## Alternatives considered

- **Inline wiring per tool in `register.ts` (status quo):** rejected — N copies of identical glue and
  unbounded growth of one file.
- **Self-registering tool modules** (each file calls `server.registerTool`): rejected — drags MCP types
  into every tool file (breaking the layering rule) and relies on side-effect imports, so there is no
  single place to see what tools exist.
- **One file per tool, flat:** rejected as a blanket rule — scatters genuinely shared mechanism into a
  global helper or duplicates it. Kept only for loners, which share nothing by definition.
- **Group by category:** rejected — labels aren't mechanisms; produces junk-drawer files.
