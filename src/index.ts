#!/usr/bin/env node
import { readFileSync } from "node:fs";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { MiteClient } from "./mite/client.js";
import { createDefaultsStoreFromEnv } from "./mite/defaults.js";
import { registerTools } from "./tools/register.js";

// Report the package's own version, read at runtime from the package.json that
// ships beside dist/, so it always matches the published version (set by the
// release pipeline) instead of a hardcoded literal drifting out of date.
const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

const server = new McpServer({
  name: "mite-mcp",
  version,
});

// One store per process: the defaults file is read/written atomically, and the
// scope is resolved from the process's cwd/env (the server runs per repo).
const defaultsStore = createDefaultsStoreFromEnv();

registerTools(server, {
  // Resolve credentials lazily so the server (and ping) start without them;
  // a missing/invalid key only surfaces when a mite-backed tool is called.
  getClient: () => MiteClient.fromEnv(),
  getDefaults: () => defaultsStore,
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// This module is the CLI entry (the package `bin`); it is only ever executed,
// never imported. Run unconditionally — an `import.meta.url === argv[1]` guard
// silently no-ops when launched through the bin symlink (npx / global install),
// which leaves the server connected to nothing.
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
