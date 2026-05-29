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
 * The canonical signature every tool handler implements: it receives the parsed
 * input and the runtime deps, resolves what it needs from `deps` itself (e.g.
 * `deps.getClient()`), and returns plain data. Typing handlers as `ToolRun<I, O>`
 * lets a tool wire one up by reference — `run: findService` — so argument order
 * and client resolution are uniform across every tool.
 */
export type ToolRun<I = Record<string, unknown>, O = unknown> = (
  input: I,
  deps: ToolDeps,
) => Promise<O> | O;

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
  // Declared as a METHOD, not a property `run: ToolRun<I>`, on purpose: method
  // parameters are bivariant, which keeps a narrowed `ToolDefinition<XInput>`
  // assignable to the registry's `ToolDefinition[]` in index.ts. A `ToolRun<I,
  // O>` handler still assigns cleanly into this slot (params match; the return
  // type is covariant to `unknown`). Do not "simplify" this to a property.
  run(input: I, deps: ToolDeps): Promise<unknown> | unknown;
}
