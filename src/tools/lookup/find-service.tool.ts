import * as z from "zod/v4";

import type { MiteClient } from "../../mite/client.js";
import { ServicesResponse } from "../../mite/schemas.js";
import type { ToolDefinition } from "../types.js";
import { lookupResources } from "./lookup.js";

export interface FindServiceInput {
  name: string;
  includeArchived?: boolean;
}

export interface ServiceCandidate {
  id: number;
  name: string;
}

export async function findService(
  client: Pick<MiteClient, "get">,
  input: FindServiceInput,
): Promise<ServiceCandidate[]> {
  const wrapped = await lookupResources(client, {
    resource: "services",
    schema: ServicesResponse,
    name: input.name,
    includeArchived: input.includeArchived,
  });
  return wrapped.map(({ service }) => ({
    id: service.id,
    name: service.name,
  }));
}

export const findServiceTool: ToolDefinition = {
  name: "find_service",
  title: "Find service",
  description:
    "Resolve a service name to mite service IDs. Matches partially and case-insensitively; returns all candidates ({ id, name }). Archived services are excluded unless includeArchived is set.",
  inputSchema: {
    name: z.string().describe("Partial, case-insensitive service name."),
    includeArchived: z
      .boolean()
      .optional()
      .describe("Include archived services in the results."),
  },
  run: (input, deps) =>
    findService(deps.getClient(), input as unknown as FindServiceInput),
};
