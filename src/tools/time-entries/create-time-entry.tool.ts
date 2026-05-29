import * as z from "zod/v4";

import { TimeEntryResponse } from "../../mite/schemas.js";
import type { ToolDefinition, ToolRun } from "../types.js";
import { resolveMinutes, shapeEntry, type ShapedEntry } from "./entry.js";

const CreateInput = z.object({
  project_id: z.number(),
  service_id: z.number(),
  minutes: z.number().optional(),
  hours: z.number().optional(),
  note: z.string().optional(),
  date_at: z.string().optional(),
  billable: z.boolean().optional(),
  /** Reserved for the per-repo defaults slice (#9). Accepted but ignored. */
  scope: z.string().optional(),
  /** Off by default — create acts immediately (ADR-0004). */
  preview: z.boolean().optional(),
});
type CreateInput = z.infer<typeof CreateInput>;

/** The payload mite receives, with omitted optional fields left out entirely. */
interface CreatePayload {
  project_id: number;
  service_id: number;
  minutes: number;
  note?: string;
  date_at?: string;
  billable?: boolean;
}

export type CreateTimeEntryResult =
  | { created: true; entry: ShapedEntry }
  | { created: false; preview: CreatePayload };

/**
 * Assemble the create payload. `minutes`/`hours` collapse to canonical minutes
 * via the shared coercion; an omitted `date_at` stays omitted so mite defaults
 * it to today (no client-side date math, ADR-0003). `scope` is ignored (#9).
 */
const buildPayload = (input: CreateInput): CreatePayload => {
  const payload: CreatePayload = {
    project_id: input.project_id,
    service_id: input.service_id,
    minutes: resolveMinutes(input),
  };
  if (input.note !== undefined) {
    payload.note = input.note;
  }
  if (input.date_at !== undefined) {
    payload.date_at = input.date_at;
  }
  if (input.billable !== undefined) {
    payload.billable = input.billable;
  }
  return payload;
};

export const createTimeEntry: ToolRun<
  CreateInput,
  CreateTimeEntryResult
> = async (input, deps) => {
  const payload = buildPayload(input);

  if (input.preview) {
    return { created: false, preview: payload };
  }

  const client = deps.getClient();
  const { time_entry } = await client.post(
    "/time_entries.json",
    { time_entry: payload },
    TimeEntryResponse,
  );
  return { created: true, entry: shapeEntry(time_entry) };
};

export const createTimeEntryTool: ToolDefinition<CreateInput> = {
  name: "create_time_entry",
  title: "Create time entry",
  description:
    "Log a mite time entry against a project and service. Accepts minutes or " +
    "hours (hours convert to minutes). Omit date_at to log against today — " +
    "mite defaults it; this server never computes the date. Acts immediately; " +
    "pass preview:true to see what would be sent without writing. The success " +
    "response echoes the resolved project and service names so you can verify " +
    "what was logged.",
  inputSchema: CreateInput.shape,
  run: (input, deps) => createTimeEntry(input, deps),
};
