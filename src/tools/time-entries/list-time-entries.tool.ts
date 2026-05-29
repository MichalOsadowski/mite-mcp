import * as z from "zod/v4";

import type { MiteClient } from "../../mite/client.js";
import { TimeEntryListResponse } from "../../mite/schemas.js";
import type { ToolDefinition } from "../types.js";
import { shapeEntry, type ShapedEntry } from "./entry.js";

/**
 * mite's documented filters for the list endpoint, passed straight through. See
 * <https://mite.de/en/api/time-entries.html>. `user_id` accepts the `current`
 * keyword. All optional; unset filters are omitted from the query.
 */
const listInputSchema = {
  at: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  project_id: z.number().optional(),
  service_id: z.number().optional(),
  customer_id: z.number().optional(),
  user_id: z.union([z.number(), z.literal("current")]).optional(),
  billable: z.boolean().optional(),
  note: z.string().optional(),
  sort: z.string().optional(),
  direction: z.enum(["asc", "desc"]).optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
} satisfies Record<string, z.ZodType>;

type ListInput = {
  [K in keyof typeof listInputSchema]?: z.infer<(typeof listInputSchema)[K]>;
};

export interface ListTimeEntriesResult {
  entries: ShapedEntry[];
}

const buildQuery = (input: ListInput): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};

export async function listTimeEntries(
  input: ListInput,
  client: Pick<MiteClient, "get">,
): Promise<ListTimeEntriesResult> {
  const wrapped = await client.get(
    `/time_entries.json${buildQuery(input)}`,
    TimeEntryListResponse,
  );
  return { entries: wrapped.map((w) => shapeEntry(w.time_entry)) };
}

export const listTimeEntriesTool: ToolDefinition<ListInput> = {
  name: "list_time_entries",
  title: "List time entries",
  description:
    "List individual mite time entries, paginated, with mite's documented " +
    "filters passed straight through (at/from/to, project_id, service_id, " +
    "customer_id, user_id (accepts 'current'), billable, note, sort, " +
    "direction, limit, page). Each entry surfaces both canonical minutes and " +
    "convenience hours. This is for inspecting individual entries — for any " +
    "totals or aggregation use the reporting tool (report_time), which " +
    "aggregates server-side and is correct across pages.",
  inputSchema: listInputSchema,
  run: (input, deps) => listTimeEntries(input, deps.getClient()),
};
