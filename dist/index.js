import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
const server = new McpServer({
    name: "mite-mcp",
    version: "0.1.0",
});
server.registerTool("ping", {
    title: "Ping",
    description: "Basic connectivity check tool.",
    inputSchema: {
        message: z.string().optional(),
    },
}, async ({ message }) => ({
    content: [
        {
            type: "text",
            text: message ?? "pong",
        },
    ],
}));
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map