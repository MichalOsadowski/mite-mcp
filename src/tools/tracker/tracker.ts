import { minutesToHours } from "../../mite/format.js";
import {
  TrackerResponse,
  type StoppedTimeEntry,
  type TrackingTimeEntry,
} from "../../mite/schemas.js";
import type { ToolDeps } from "../types.js";

/**
 * The shared mechanism for the `tracker/` module: resolving and shaping the one
 * running timer. `get_tracker` returns this directly; `stop_tracker` calls it to
 * discover which entry to stop (and to short-circuit idempotently when none is
 * running). Keeping the resolve in one place is what makes the three tools a
 * module rather than three loners.
 */

/** The running timer shaped for tool output: canonical minutes + convenience hours. */
export interface RunningEntry {
  id: number;
  minutes: number;
  hours: number;
  since: string;
}

/** `running` discriminates: `true` carries the entry, `false` is the clear "none". */
export type RunningState =
  | { running: true; entry: RunningEntry }
  | { running: false };

/**
 * Shape mite's `tracking_time_entry` (or its absence) into a `RunningState`.
 * Shared by `get_tracker` (after a GET) and `start_tracker` (after a PATCH),
 * which both receive this same key from the tracker envelope.
 */
export const shapeRunning = (
  entry: TrackingTimeEntry | undefined,
): RunningState => {
  if (entry === undefined) {
    return { running: false };
  }
  return {
    running: true,
    entry: {
      id: entry.id,
      minutes: entry.minutes,
      hours: minutesToHours(entry.minutes),
      since: entry.since,
    },
  };
};

/** GET /tracker.json and resolve it to a running entry or a clear none. */
export const resolveRunning = async (deps: ToolDeps): Promise<RunningState> => {
  const client = deps.getClient();
  const { tracker } = await client.get("/tracker.json", TrackerResponse);
  return shapeRunning(tracker.tracking_time_entry);
};

/** A stopped entry shaped for tool output: id + final minutes (and hours). */
export interface StoppedEntry {
  id: number;
  minutes: number;
  hours: number;
}

/** `stopped` discriminates: `true` carries the entry, `false` is the idempotent no-op. */
export type StopState =
  | { stopped: true; entry: StoppedEntry }
  | { stopped: false };

/** Shape mite's `stopped_time_entry` (from a DELETE) for tool output. */
export const shapeStopped = (entry: StoppedTimeEntry): StoppedEntry => ({
  id: entry.id,
  minutes: entry.minutes,
  hours: minutesToHours(entry.minutes),
});
