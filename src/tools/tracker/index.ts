import type { ToolDefinition } from "../types.js";
import { getTrackerTool } from "./get-tracker.tool.js";
import { startTrackerTool } from "./start-tracker.tool.js";
import { stopTrackerTool } from "./stop-tracker.tool.js";

export const tools: ToolDefinition[] = [
  getTrackerTool,
  startTrackerTool,
  stopTrackerTool,
];
