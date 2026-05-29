import { tools as lookupTools } from "./lookup/index.js";
import { tools as pingTools } from "./ping/index.js";
import type { ToolDefinition } from "./types.js";
import { tools as whoamiTools } from "./whoami/index.js";

/**
 * The tool registry — every tool the server exposes, assembled by spreading
 * each concept directory's tool array. This changes only when a directory is
 * added, never per tool. register.ts loops it.
 */
export const tools: ToolDefinition[] = [
  ...pingTools,
  ...whoamiTools,
  ...lookupTools,
];
