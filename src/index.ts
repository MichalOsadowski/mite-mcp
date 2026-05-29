#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { MiteClient } from "./mite/client.js";
import { createDefaultsStoreFromEnv } from "./mite/defaults.js";
import { registerTools } from "./tools/register.js";

const server = new McpServer({
  name: "mite-mcp",
  version: "0.1.0",
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
