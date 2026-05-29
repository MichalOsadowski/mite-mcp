import * as z from "zod/v4";

import { TimeEntryResponse } from "../../mite/schemas.js";
import type { ToolDefinition, ToolRun } from "../types.js";
import { resolveMinutes, shapeEntry, type ShapedEntry } from "./entry.js";

const UpdateInput = z.object({
  id: z.number(),
  minutes: z.number().optional(),
  hours: z.number().optional(),
  note: z.string().optional(),
  date_at: z.string().optional(),
  billable: z.boolean().optional(),
  project_id: z.number().optional(),
  service_id: z.number().optional(),
  /** Off by default — update is destructive, so it dry-runs unless set (ADR-0004). */
  confirm: z.boolean().optional(),
});
type UpdateInput = z.infer<typeof UpdateInput>;

/**
 * A partial update payload: only the fields the caller provided are present, so
 * unspecified fields are left untouched in mite. Duration collapses to canonical
 * minutes and only when a duration was given (unlike create, update never
 * requires one).
 */
interface UpdatePayload {
  minutes?: number;
  note?: string;
  date_at?: string;
  billable?: boolean;
  project_id?: number;
  service_id?: number;
}

export type UpdateTimeEntryResult =
  | { updated: true; entry: ShapedEntry }
  | { updated: false; preview: { id: number } & UpdatePayload };

/**
 * Assemble the partial update payload. Each field is included only when the
 * caller provided it; `minutes`/`hours` collapse to canonical minutes via the
 * shared coercion, and duration is omitted entirely when neither is given
 * (ADR-0003).
 */
const buildPayload = (input: UpdateInput): UpdatePayload => {
  const payload: UpdatePayload = {};
  if (input.minutes !== undefined || input.hours !== undefined) {
    payload.minutes = resolveMinutes(input);
  }
  if (input.note !== undefined) {
    payload.note = input.note;
  }
  if (input.date_at !== undefined) {
    payload.date_at = input.date_at;
  }
  if (input.billable !== undefined) {
    payload.billable = input.billable;
  }
  if (input.project_id !== undefined) {
    payload.project_id = input.project_id;
  }
  if (input.service_id !== undefined) {
    payload.service_id = input.service_id;
  }
  return payload;
};

export const updateTimeEntry: ToolRun<
  UpdateInput,
  UpdateTimeEntryResult
> = async (input, deps) => {
  const payload = buildPayload(input);

  if (!input.confirm) {
    return { updated: false, preview: { id: input.id, ...payload } };
  }

  const client = deps.getClient();
  const path = `/time_entries/${input.id}.json`;
  // mite's PATCH returns an empty body, so re-read the entry to echo the result
  // (symmetry with create) through the existing schema seam.
  await client.patch(path, { time_entry: payload });
  const { time_entry } = await client.get(path, TimeEntryResponse);
  return { updated: true, entry: shapeEntry(time_entry) };
};

export const updateTimeEntryTool: ToolDefinition<UpdateInput> = {
  name: "update_time_entry",
  title: "Update time entry",
  description:
    "Change fields on an existing mite time entry by id. Only the fields you " +
    "pass are modified; others are left untouched. Accepts minutes or hours " +
    "(hours convert to minutes). Destructive, so it dry-runs by default: " +
    "without confirm:true it returns a preview of what would be sent and " +
    "writes nothing. Pass confirm:true to apply the change; the response then " +
    "echoes the updated entry. A locked entry yields a clear locked-error " +
    "message and is not changed.",
  inputSchema: UpdateInput.shape,
  run: updateTimeEntry,
};
