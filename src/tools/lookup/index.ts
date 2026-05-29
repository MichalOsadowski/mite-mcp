import type { ToolDefinition } from "../types.js";
import { findServiceTool } from "./find-service.tool.js";

export const tools: ToolDefinition[] = [findServiceTool];
