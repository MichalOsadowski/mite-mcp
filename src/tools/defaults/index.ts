import type { ToolDefinition } from "../types.js";
import { clearDefaultTool } from "./clear-default.tool.js";
import { getDefaultTool } from "./get-default.tool.js";
import { listDefaultsTool } from "./list-defaults.tool.js";
import { setDefaultTool } from "./set-default.tool.js";

export const tools: ToolDefinition[] = [
  setDefaultTool,
  getDefaultTool,
  clearDefaultTool,
  listDefaultsTool,
];
