import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { MiteClient } from "./mite/client.js";
import { registerTools } from "./tools/register.js";

const server = new McpServer({
  name: "mite-mcp",
  version: "0.1.0",
});

registerTools(server, {
  // Resolve credentials lazily so the server (and ping) start without them;
  // a missing/invalid key only surfaces when a mite-backed tool is called.
  getClient: () => MiteClient.fromEnv(),
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
