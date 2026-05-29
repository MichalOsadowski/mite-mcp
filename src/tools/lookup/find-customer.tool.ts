import * as z from "zod/v4";

import type { MiteClient } from "../../mite/client.js";
import { CustomersResponse } from "../../mite/schemas.js";
import type { ToolDefinition } from "../types.js";
import { lookupResources } from "./lookup.js";

const FindCustomerInput = z.object({
  name: z.string().describe("Partial, case-insensitive customer name."),
  includeArchived: z
    .boolean()
    .optional()
    .describe("Include archived customers in the results."),
});
type FindCustomerInput = z.infer<typeof FindCustomerInput>;

export interface CustomerCandidate {
  id: number;
  name: string;
}

export async function findCustomer(
  client: Pick<MiteClient, "get">,
  input: FindCustomerInput,
): Promise<CustomerCandidate[]> {
  const wrapped = await lookupResources(client, {
    resource: "customers",
    schema: CustomersResponse,
    name: input.name,
    includeArchived: input.includeArchived,
  });
  return wrapped.map(({ customer }) => ({
    id: customer.id,
    name: customer.name,
  }));
}

export const findCustomerTool: ToolDefinition<FindCustomerInput> = {
  name: "find_customer",
  title: "Find customer",
  description:
    "Resolve a customer name to mite customer IDs. Matches partially and case-insensitively; returns all candidates ({ id, name }). Archived customers are excluded unless includeArchived is set.",
  inputSchema: FindCustomerInput.shape,
  run: (input, deps) => findCustomer(deps.getClient(), input),
};
