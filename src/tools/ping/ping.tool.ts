import * as z from "zod/v4";

import type { ToolDefinition } from "../types.js";

export const createPingText = (message?: string): string => message ?? "pong";

export const pingTool: ToolDefinition<{ message?: string }> = {
  name: "ping",
  title: "Ping",
  description: "Basic connectivity check tool.",
  inputSchema: { message: z.string().optional() },
  run: (input) => createPingText(input.message),
};
