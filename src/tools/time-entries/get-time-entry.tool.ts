import * as z from "zod/v4";

import type { MiteClient } from "../../mite/client.js";
import { TimeEntryResponse } from "../../mite/schemas.js";
import type { ToolDefinition } from "../types.js";
import { shapeEntry, type ShapedEntry } from "./entry.js";

const getInputSchema = {
  id: z.number(),
} satisfies Record<string, z.ZodType>;

type GetInput = { id: number };

export interface GetTimeEntryResult {
  entry: ShapedEntry;
}

export async function getTimeEntry(
  input: GetInput,
  client: Pick<MiteClient, "get">,
): Promise<GetTimeEntryResult> {
  const { time_entry } = await client.get(
    `/time_entries/${input.id}.json`,
    TimeEntryResponse,
  );
  return { entry: shapeEntry(time_entry) };
}

export const getTimeEntryTool: ToolDefinition<GetInput> = {
  name: "get_time_entry",
  title: "Get time entry",
  description:
    "Fetch a single mite time entry by id. Surfaces both canonical minutes " +
    "and convenience hours. For totals or aggregation across entries use the " +
    "reporting tool (report_time) instead.",
  inputSchema: getInputSchema,
  run: (input, deps) => getTimeEntry(input, deps.getClient()),
};
