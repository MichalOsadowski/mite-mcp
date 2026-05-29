import type { ToolDefinition } from "../types.js";
import { findCustomerTool } from "./find-customer.tool.js";
import { findServiceTool } from "./find-service.tool.js";

export const tools: ToolDefinition[] = [findServiceTool, findCustomerTool];
