import type { ToolDefinition } from "../types.js";
import { createTimeEntryTool } from "./create-time-entry.tool.js";
import { getTimeEntryTool } from "./get-time-entry.tool.js";
import { listTimeEntriesTool } from "./list-time-entries.tool.js";

export const tools: ToolDefinition[] = [
  listTimeEntriesTool,
  getTimeEntryTool,
  createTimeEntryTool,
];
