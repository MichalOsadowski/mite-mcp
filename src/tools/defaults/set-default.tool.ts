import * as z from "zod/v4";

import { NoScopeError } from "../../mite/defaults.js";
import type { ToolDefinition, ToolRun } from "../types.js";
import {
  noScopeResponse,
  resolveProjectName,
  resolveServiceName,
  type NamedRef,
  type NoScopeResponse,
} from "./resolve.js";

const SetDefaultInput = z.object({
  project_id: z.number().describe("mite project id to default to."),
  service_id: z.number().describe("mite service id to default to."),
  /**
   * The scope key is normally resolved from the environment (ADR-0005) and the
   * agent omits it. An explicit value is the not-built-now global-mode bridge.
   */
  scope: z
    .string()
    .optional()
    .describe(
      "Advanced: an explicit scope key. Normally omitted — the scope is " +
        "resolved from the environment so it never drifts.",
    ),
});
type SetDefaultInput = z.infer<typeof SetDefaultInput>;

export type SetDefaultResult =
  | { scope: string; project: NamedRef; service: NamedRef }
  | NoScopeResponse;

export const setDefault: ToolRun<SetDefaultInput, SetDefaultResult> = async (
  input,
  deps,
) => {
  const store = deps.getDefaults();
  const scope = store.resolveKey(input.scope);
  if (scope === null) {
    return noScopeResponse(deps);
  }

  try {
    await store.set(input.scope, {
      project_id: input.project_id,
      service_id: input.service_id,
    });
  } catch (error) {
    // A racing resolution change could still surface NoScopeError; keep it
    // structured rather than letting it become a generic error dump.
    if (error instanceof NoScopeError) {
      return noScopeResponse(deps);
    }
    throw error;
  }

  const [project, service] = await Promise.all([
    resolveProjectName(deps, input.project_id),
    resolveServiceName(deps, input.service_id),
  ]);
  return { scope, project, service };
};

export const setDefaultTool: ToolDefinition<SetDefaultInput> = {
  name: "set_default",
  title: "Set default project/service",
  description:
    "Bind the current scope (resolved from the environment — usually this " +
    "repo) to a default project and service, so create_time_entry needs no " +
    "ids. Returns the resolved project and service names so you can confirm " +
    "what was stored. The scope key is environment-derived and not authored " +
    "by you.",
  inputSchema: SetDefaultInput.shape,
  run: setDefault,
};
