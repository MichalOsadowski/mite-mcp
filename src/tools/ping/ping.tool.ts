import * as z from "zod/v4";

import type { ToolDefinition, ToolRun } from "../types.js";

export const createPingText = (message?: string): string => message ?? "pong";

export const ping: ToolRun<{ message?: string }, string> = (input) =>
  createPingText(input.message);

export const pingTool: ToolDefinition<{ message?: string }> = {
  name: "ping",
  title: "Ping",
  description: "Basic connectivity check tool.",
  inputSchema: { message: z.string().optional() },
  run: ping,
};
