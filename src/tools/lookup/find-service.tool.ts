import * as z from "zod/v4";

import { ServicesResponse } from "../../mite/schemas.js";
import type { ToolDefinition, ToolRun } from "../types.js";
import { lookupResources } from "./lookup.js";

const FindServiceInput = z.object({
  name: z.string().describe("Partial, case-insensitive service name."),
  includeArchived: z
    .boolean()
    .optional()
    .describe("Include archived services in the results."),
});
type FindServiceInput = z.infer<typeof FindServiceInput>;

export interface ServiceCandidate {
  id: number;
  name: string;
}

export const findService: ToolRun<
  FindServiceInput,
  ServiceCandidate[]
> = async (input, deps) => {
  const wrapped = await lookupResources(deps.getClient(), {
    resource: "services",
    schema: ServicesResponse,
    name: input.name,
    includeArchived: input.includeArchived,
  });
  return wrapped.map(({ service }) => ({
    id: service.id,
    name: service.name,
  }));
};

export const findServiceTool: ToolDefinition<FindServiceInput> = {
  name: "find_service",
  title: "Find service",
  description:
    "Resolve a service name to mite service IDs. Matches partially and case-insensitively; returns all candidates ({ id, name }). Archived services are excluded unless includeArchived is set.",
  inputSchema: FindServiceInput.shape,
  run: findService,
};
