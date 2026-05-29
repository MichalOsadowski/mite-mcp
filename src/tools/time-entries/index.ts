import type { ToolDefinition } from "../types.js";
import { createTimeEntryTool } from "./create-time-entry.tool.js";
import { deleteTimeEntryTool } from "./delete-time-entry.tool.js";
import { getTimeEntryTool } from "./get-time-entry.tool.js";
import { listTimeEntriesTool } from "./list-time-entries.tool.js";
import { updateTimeEntryTool } from "./update-time-entry.tool.js";

export const tools: ToolDefinition[] = [
  listTimeEntriesTool,
  getTimeEntryTool,
  createTimeEntryTool,
  updateTimeEntryTool,
  deleteTimeEntryTool,
];
