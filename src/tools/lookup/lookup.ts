import type { ZodType } from "zod/v4";

import type { MiteClient } from "../../mite/client.js";

/**
 * Shared name->id lookup engine for the find_* tools. mite matches the `?name=`
 * query partially and case-insensitively server-side, so we never re-filter on
 * name. Optional `filters` are appended as further query params so additional
 * narrowing (e.g. customer_id) is delegated to mite too; undefined values are
 * skipped. Active and archived resources live behind separate endpoints;
 * including archived means a second call, with the (disjoint) results
 * concatenated. The same query string is reused for both calls, so any filter
 * applies to active and archived alike.
 */
export async function lookupResources<R>(
  client: Pick<MiteClient, "get">,
  options: {
    resource: string;
    schema: ZodType<R[]>;
    name: string;
    includeArchived?: boolean;
    filters?: Record<string, string | number | undefined>;
  },
): Promise<R[]> {
  let query = `?name=${encodeURIComponent(options.name)}`;
  for (const [key, value] of Object.entries(options.filters ?? {})) {
    if (value === undefined) {
      continue;
    }
    query += `&${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
  }
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
