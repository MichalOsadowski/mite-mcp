import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { MiteApiError } from "../mite/client.js";
import { tools } from "./index.js";
import type { ToolDefinition, ToolDeps } from "./types.js";

type TextResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

/**
 * The one MCP-aware adapter: run a tool and shape its plain return value into an
 * MCP result. A string becomes the text verbatim; anything else is pretty JSON.
 * A MiteApiError surfaces its non-leaky message; any other throw is hidden
 * behind a generic message. This is the only place tools touch MCP result shape.
 */
export const toHandler =
  (tool: ToolDefinition, deps: ToolDeps) =>
  async (input: Record<string, unknown>): Promise<TextResult> => {
    try {
      const data = await tool.run(input, deps);
      const text =
        typeof data === "string" ? data : JSON.stringify(data, null, 2);
      return { content: [{ type: "text", text }] };
    } catch (error) {
      const text =
        error instanceof MiteApiError
          ? error.message
          : "Unexpected error talking to mite.";
      return { content: [{ type: "text", text }], isError: true };
    }
  };

export function registerTools(server: McpServer, deps: ToolDeps): void {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      toHandler(tool, deps),
    );
  }
}
