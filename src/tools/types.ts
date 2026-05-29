import type { ZodRawShape } from "zod/v4";

import type { MiteClient } from "../mite/client.js";

/**
 * What a tool may reach for at run time. The client is resolved lazily so
 * credential-free tools (ping) never trigger client construction.
 */
export interface ToolDeps {
  getClient: () => Pick<MiteClient, "get" | "post">;
}

/**
 * A tool described as plain data. It knows nothing about MCP: `run` returns a
 * value, and the single adapter in register.ts shapes that value into an MCP
 * result (and maps errors). One tool per file; filename is the kebab-case of
 * `name`. See ADR-0006.
 */
export interface ToolDefinition<I = Record<string, unknown>> {
  name: string;
  title: string;
  description: string;
  inputSchema: ZodRawShape;
  run(input: I, deps: ToolDeps): Promise<unknown> | unknown;
}
