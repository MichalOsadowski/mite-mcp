import * as z from "zod/v4";

import { TrackerResponse } from "../../mite/schemas.js";
import type { ToolDeps, ToolDefinition, ToolRun } from "../types.js";
import { resolveRunning, shapeStopped, type StopState } from "./tracker.js";

/**
 * Stop normally takes no id: it resolves the one running timer (via the shared
 * mechanism) and stops it. An optional `time_entry_id` lets you target a
 * specific entry directly. Stop is idempotent — when nothing is running it is a
 * no-op success, and it acts immediately (a stop is reversible via start).
 */
const StopInput = z.object({
  time_entry_id: z.number().optional(),
});
type StopInput = z.infer<typeof StopInput>;

/** DELETE /tracker/:id.json to stop the timer; shape the stopped entry. */
const stopById = async (id: number, deps: ToolDeps): Promise<StopState> => {
  const client = deps.getClient();
  const { tracker } = await client.del(`/tracker/${id}.json`, TrackerResponse);
  if (tracker.stopped_time_entry === undefined) {
    return { stopped: false };
  }
  return { stopped: true, entry: shapeStopped(tracker.stopped_time_entry) };
};

export const stopTracker: ToolRun<StopInput, StopState> = async (
  input,
  deps,
) => {
  if (input.time_entry_id !== undefined) {
    return stopById(input.time_entry_id, deps);
  }
  // No id: resolve the running timer. Nothing running → idempotent no-op.
  const current = await resolveRunning(deps);
  if (!current.running) {
    return { stopped: false };
  }
  return stopById(current.entry.id, deps);
};

export const stopTrackerTool: ToolDefinition<StopInput> = {
  name: "stop_tracker",
  title: "Stop tracker",
  description:
    "Stop the single running timer. With no arguments it stops whatever is " +
    "currently running; pass a time_entry_id to stop a specific entry. " +
    "Idempotent: when nothing is running it succeeds as a no-op " +
    "({ stopped: false }). Acts immediately (a stop is reversible via " +
    "start_tracker). On success it echoes the entry id and its final minutes.",
  inputSchema: StopInput.shape,
  run: stopTracker,
};
