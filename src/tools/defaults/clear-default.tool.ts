import * as z from "zod/v4";

import type { ToolDefinition, ToolRun } from "../types.js";

const ClearDefaultInput = z.object({
  scope: z
    .string()
    .optional()
    .describe("Advanced: an explicit scope key. Normally omitted."),
});
type ClearDefaultInput = z.infer<typeof ClearDefaultInput>;

export type ClearDefaultResult =
  | { cleared: true; scope: string }
  | { cleared: false; message: string };

export const clearDefault: ToolRun<
  ClearDefaultInput,
  ClearDefaultResult
> = async (input, deps) => {
  const store = deps.getDefaults();
  const scope = store.resolveKey(input.scope);
  if (scope === null) {
    return {
      cleared: false,
      message:
        "No scope could be resolved from the environment, so there is nothing to clear.",
    };
  }
  await store.clear(input.scope);
  return { cleared: true, scope };
};

export const clearDefaultTool: ToolDefinition<ClearDefaultInput> = {
  name: "clear_default",
  title: "Clear default project/service",
  description:
    "Remove the default project/service bound to the current scope (resolved " +
    "from the environment).",
  inputSchema: ClearDefaultInput.shape,
  run: clearDefault,
};
