import type { ZodType } from "zod/v4";

import type { MiteClient } from "../../mite/client.js";

/**
 * Shared name->id lookup engine for the find_* tools. mite matches the `?name=`
 * query partially and case-insensitively server-side, so we never re-filter on
 * name. Active and archived resources live behind separate endpoints; including
 * archived means a second call, with the (disjoint) results concatenated.
 */
export async function lookupResources<R>(
  client: Pick<MiteClient, "get">,
  options: {
    resource: string;
    schema: ZodType<R[]>;
    name: string;
    includeArchived?: boolean;
  },
): Promise<R[]> {
  const query = `?name=${encodeURIComponent(options.name)}`;
  const active = await client.get(
    `/${options.resource}.json${query}`,
    options.schema,
  );
  if (!options.includeArchived) {
    return active;
  }
  const archived = await client.get(
    `/${options.resource}/archived.json${query}`,
    options.schema,
  );
  return [...active, ...archived];
}
