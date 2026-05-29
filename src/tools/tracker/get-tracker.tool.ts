import type { ToolDefinition, ToolRun } from "../types.js";
import { resolveRunning, type RunningState } from "./tracker.js";

export const getTracker: ToolRun<Record<string, unknown>, RunningState> = (
  _input,
  deps,
) => resolveRunning(deps);

export const getTrackerTool: ToolDefinition = {
  name: "get_tracker",
  title: "Get tracker",
  description:
    "Return the single running timer for the authenticated user. When a timer " +
    "is running the result is { running: true, entry } with the entry's id, " +
    "accumulated minutes (and hours), and the start timestamp; when nothing is " +
    "running it is { running: false }.",
  inputSchema: {},
  run: getTracker,
};
