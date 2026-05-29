import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";

import { MiteApiError, MiteClient } from "../mite/client.js";
import { whoami } from "./resolve.js";

export const createPingText = (message?: string): string => message ?? "pong";

type TextResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

type MiteClientLike = Pick<MiteClient, "get">;

export const makeWhoamiHandler =
  (getClient: () => MiteClientLike) => async (): Promise<TextResult> => {
    try {
      const result = await whoami(getClient());
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const text =
        error instanceof MiteApiError
          ? error.message
          : "Unexpected error talking to mite.";
      return { content: [{ type: "text", text }], isError: true };
    }
  };

export interface ToolDeps {
  getClient: () => MiteClientLike;
}

export function registerTools(server: McpServer, deps: ToolDeps): void {
  server.registerTool(
    "ping",
    {
      title: "Ping",
      description: "Basic connectivity check tool.",
      inputSchema: { message: z.string().optional() },
    },
    async ({ message }) => ({
      content: [{ type: "text", text: createPingText(message) }],
    }),
  );

  server.registerTool(
    "whoami",
    {
      title: "Who am I",
      description:
        "Return the authenticated mite user (id, name, role) and account name.",
      inputSchema: {},
    },
    makeWhoamiHandler(deps.getClient),
  );
}
