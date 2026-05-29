import * as z from "zod/v4";

import type { Default } from "../../mite/defaults.js";
import type { ToolDefinition, ToolRun } from "../types.js";
import { noScopeResponse, type NoScopeResponse } from "./resolve.js";

const GetDefaultInput = z.object({
  scope: z
    .string()
    .optional()
    .describe("Advanced: an explicit scope key. Normally omitted."),
});
type GetDefaultInput = z.infer<typeof GetDefaultInput>;

export type GetDefaultResult =
  | { found: true; scope: string; default: Default }
  | { found: false; scope: string; existing_scopes: string[]; message: string }
  | NoScopeResponse;

export const getDefault: ToolRun<GetDefaultInput, GetDefaultResult> = async (
  input,
  deps,
) => {
  const store = deps.getDefaults();
  const scope = store.resolveKey(input.scope);
  if (scope === null) {
    return noScopeResponse(deps);
  }

  const value = await store.get(input.scope);
  if (value === null) {
    return {
      found: false,
      scope,
      existing_scopes: Object.keys(await store.list()),
      message: `No default is set for scope "${scope}". Set one with set_default.`,
    };
  }
  return { found: true, scope, default: value };
};

export const getDefaultTool: ToolDefinition<GetDefaultInput> = {
  name: "get_default",
  title: "Get default project/service",
  description:
    "Show the default project/service bound to the current scope (resolved " +
    "from the environment). Returns a structured response naming existing " +
    "scopes when none is set.",
  inputSchema: GetDefaultInput.shape,
  run: getDefault,
};
