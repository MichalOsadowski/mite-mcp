import * as z from "zod/v4";

import { TimeEntryResponse, TrackerResponse } from "../../mite/schemas.js";
import { resolveMinutes } from "../time-entries/entry.js";
import type { ToolDeps, ToolDefinition, ToolRun } from "../types.js";
import { shapeRunning, type RunningState } from "./tracker.js";

/**
 * Start takes EITHER an existing `time_entry_id`, OR create fields for the
 * create-then-start convenience (which follows `create_time_entry` semantics —
 * acts immediately). The two modes can't both be enforced in the zod schema
 * without `.refine()` (a ZodEffects loses `.shape`, which `inputSchema` needs),
 * so the mode is selected in the handler: an id wins; with neither, we throw.
 */
const StartInput = z.object({
  time_entry_id: z.number().optional(),
  project_id: z.number().optional(),
  service_id: z.number().optional(),
  minutes: z.number().optional(),
  hours: z.number().optional(),
  note: z.string().optional(),
  date_at: z.string().optional(),
  billable: z.boolean().optional(),
});
type StartInput = z.infer<typeof StartInput>;

/** The create payload for create-then-start, mirroring `create_time_entry`. */
interface CreatePayload {
  project_id: number;
  service_id: number;
  minutes: number;
  note?: string;
  date_at?: string;
  billable?: boolean;
}

const buildCreatePayload = (
  input: StartInput,
  project_id: number,
  service_id: number,
): CreatePayload => {
  const payload: CreatePayload = {
    project_id,
    service_id,
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

/** Create an entry following `create_time_entry` semantics, return its id. */
const createEntry = async (
  input: StartInput,
  deps: ToolDeps,
): Promise<number> => {
  if (input.project_id === undefined || input.service_id === undefined) {
    throw new Error(
      "create-then-start needs both project_id and service_id (or pass a time_entry_id to start an existing entry).",
    );
  }
  const payload = buildCreatePayload(input, input.project_id, input.service_id);
  const client = deps.getClient();
  const { time_entry } = await client.post(
    "/time_entries.json",
    { time_entry: payload },
    TimeEntryResponse,
  );
  return time_entry.id;
};

/** PATCH /tracker/:id.json to start the timer; shape the running result. */
const startAgainst = async (
  id: number,
  deps: ToolDeps,
): Promise<RunningState> => {
  const client = deps.getClient();
  const { tracker } = await client.patch(
    `/tracker/${id}.json`,
    TrackerResponse,
  );
  return shapeRunning(tracker.tracking_time_entry);
};

export const startTracker: ToolRun<StartInput, RunningState> = async (
  input,
  deps,
) => {
  // An explicit id wins — start the existing entry, no create.
  if (input.time_entry_id !== undefined) {
    return startAgainst(input.time_entry_id, deps);
  }
  // No id, but create fields → create-then-start convenience.
  if (input.project_id !== undefined || input.service_id !== undefined) {
    const id = await createEntry(input, deps);
    return startAgainst(id, deps);
  }
  throw new Error(
    "start_tracker needs a time_entry_id to start an existing entry, or project_id + service_id (with minutes or hours) to create one and start it.",
  );
};

export const startTrackerTool: ToolDefinition<StartInput> = {
  name: "start_tracker",
  title: "Start tracker",
  description:
    "Start the single running timer. Pass a time_entry_id to start the timer " +
    "against an existing entry. As a convenience you may instead pass create " +
    "fields (project_id + service_id, and minutes or hours, optionally note / " +
    "date_at / billable) to create an entry and start it in one call — the " +
    "create follows create_time_entry semantics. If both are given, " +
    "time_entry_id wins. Acts immediately (start is reversible — stop_tracker " +
    "undoes it).",
  inputSchema: StartInput.shape,
  run: startTracker,
};
