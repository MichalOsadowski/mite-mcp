import * as z from "zod/v4";

import { TimeEntryResponse } from "../../mite/schemas.js";
import type { ToolDefinition, ToolRun } from "../types.js";
import { shapeEntry, type ShapedEntry } from "./entry.js";

const GetInput = z.object({
  id: z.number(),
});
type GetInput = z.infer<typeof GetInput>;

export interface GetTimeEntryResult {
  entry: ShapedEntry;
}

export const getTimeEntry: ToolRun<GetInput, GetTimeEntryResult> = async (
  input,
  deps,
) => {
  const { time_entry } = await deps
    .getClient()
    .get(`/time_entries/${input.id}.json`, TimeEntryResponse);
  return { entry: shapeEntry(time_entry) };
};

export const getTimeEntryTool: ToolDefinition<GetInput> = {
  name: "get_time_entry",
  title: "Get time entry",
  description:
    "Fetch a single mite time entry by id. Surfaces both canonical minutes " +
    "and convenience hours. For totals or aggregation across entries use the " +
    "reporting tool (report_time) instead.",
  inputSchema: GetInput.shape,
  run: getTimeEntry,
};
