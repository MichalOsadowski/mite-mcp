import * as z from "zod/v4";

import type { MiteClient } from "../../mite/client.js";
import { ProjectsResponse } from "../../mite/schemas.js";
import type { ToolDefinition } from "../types.js";
import { lookupResources } from "./lookup.js";

export interface FindProjectInput {
  name: string;
  includeArchived?: boolean;
  customer_id?: number;
}

export interface ProjectCandidate {
  id: number;
  name: string;
  customer_id: number | null;
  customer_name: string | null;
}

export async function findProject(
  client: Pick<MiteClient, "get">,
  input: FindProjectInput,
): Promise<ProjectCandidate[]> {
  const wrapped = await lookupResources(client, {
    resource: "projects",
    schema: ProjectsResponse,
    name: input.name,
    includeArchived: input.includeArchived,
    // mite filters /projects by customer_id server-side, so delegate the
    // narrowing rather than re-filtering the response client-side.
    filters: { customer_id: input.customer_id },
  });
  return wrapped.map(({ project }) => ({
    id: project.id,
    name: project.name,
    // Customer-less projects may arrive as null or with the key absent; present
    // a stable shape by normalizing either to null.
    customer_id: project.customer_id ?? null,
    customer_name: project.customer_name ?? null,
  }));
}

export const findProjectTool: ToolDefinition = {
  name: "find_project",
  title: "Find project",
  description:
    "Resolve a project name to mite project IDs. Matches partially and case-insensitively; returns all candidates ({ id, name, customer_id, customer_name }). Archived projects are excluded unless includeArchived is set; pass customer_id to narrow to one customer's projects.",
  inputSchema: {
    name: z.string().describe("Partial, case-insensitive project name."),
    includeArchived: z
      .boolean()
      .optional()
      .describe("Include archived projects in the results."),
    customer_id: z
      .number()
      .optional()
      .describe("Restrict results to projects belonging to this customer."),
  },
  run: (input, deps) =>
    findProject(deps.getClient(), input as unknown as FindProjectInput),
};
