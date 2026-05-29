import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

export const createPingText = (message?: string): string => message ?? "pong";

const server = new McpServer({
  name: "mite-mcp",
  version: "0.1.0",
});

server.registerTool(
  "ping",
  {
    title: "Ping",
    description: "Basic connectivity check tool.",
    inputSchema: {
      message: z.string().optional(),
    },
  },
  async ({ message }) => ({
    content: [
      {
        type: "text",
        text: createPingText(message),
      },
    ],
  }),
);

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
