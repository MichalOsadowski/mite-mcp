# mite-mcp

MCP server in TypeScript to allow agents to interact with mite.de.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Format check

```bash
npm run format
```

## Test

```bash
npm test
```

## Run

```bash
npm start
```

## Per-repo defaults

Naming the project and service on every `create_time_entry` is friction. Bind a working context
(usually a repository) to a default project + service once, and the dominant create flow needs no
ids. See [ADR-0005](docs/adr/0005-per-repo-scope-defaults.md).

### How the scope is resolved

The **scope** is the key that binds a context to its default. It is resolved from the environment —
**never authored by the agent** — by this priority chain, so it never drifts:

1. an explicit `scope` argument (advanced / future global mode — normally omitted);
2. the `MITE_DEFAULT_SCOPE` environment variable (set in the repo's `.mcp.json`);
3. the normalized git remote URL of the repository (https and ssh forms collapse to one key);
4. the repository root path (when there is no remote);
5. none → a structured "no default" response that names existing scopes and points at `set_default`.

Defaults are stored in `~/.config/mite-mcp/defaults.json` (honoring `XDG_CONFIG_HOME`), shaped
`{ "scopes": { "<key>": { "project_id", "service_id" } } }`. Only project + service are stored — the
customer is derivable. Writes are atomic (write-temp-then-rename), so multiple server processes may
share the file safely.

### Setting a default

Run the server inside the repo and call the tools (the agent omits `scope`):

- `set_default({ project_id, service_id })` — binds the resolved scope and returns the resolved
  project and service **names** so you can confirm what was stored.
- `get_default()` — shows the current scope's default (or a structured response naming existing
  scopes if none is set).
- `clear_default()` — removes it.
- `list_defaults()` — lists every stored scope.

Then `create_time_entry({ minutes: 90, note: "work" })` logs against the default and echoes the
resolved project/service names. If no default exists, you get an actionable prompt to set one rather
than an error.

### Example `.mcp.json`

Run the server **per repo** with a project-scoped `.mcp.json`. Setting `MITE_DEFAULT_SCOPE` pins the
scope key explicitly (step 2), which is the most reliable option:

```json
{
  "mcpServers": {
    "mite": {
      "command": "node",
      "args": ["/absolute/path/to/mite-mcp/dist/index.js"],
      "env": {
        "MITE_ACCOUNT": "your-account",
        "MITE_API_KEY": "your-api-key",
        "MITE_DEFAULT_SCOPE": "acme-web"
      }
    }
  }
}
```

Build first with `npm run build`, then point `args` at the built `dist/index.js` (the same entry
`npm start` runs). `MITE_ACCOUNT` is your `{account}.mite.de` subdomain and `MITE_API_KEY` your mite
API key. You can omit `MITE_DEFAULT_SCOPE` and let the scope fall through to the git remote / repo
path instead.
