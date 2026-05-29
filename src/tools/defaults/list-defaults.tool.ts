import * as z from "zod/v4";

import type { Default } from "../../mite/defaults.js";
import type { ToolDefinition, ToolRun } from "../types.js";

const ListDefaultsInput = z.object({});
type ListDefaultsInput = z.infer<typeof ListDefaultsInput>;

export interface ListDefaultsResult {
  scopes: Record<string, Default>;
}

export const listDefaults: ToolRun<
  ListDefaultsInput,
  ListDefaultsResult
> = async (_input, deps) => {
  const scopes = await deps.getDefaults().list();
  return { scopes };
};

export const listDefaultsTool: ToolDefinition<ListDefaultsInput> = {
  name: "list_defaults",
  title: "List default scopes",
  description:
    "List every stored scope and its default project/service ids. Useful for " +
    "seeing which scopes exist when the current one has no default.",
  inputSchema: ListDefaultsInput.shape,
  run: listDefaults,
};
