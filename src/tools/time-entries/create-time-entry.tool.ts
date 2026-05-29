import * as z from "zod/v4";

import { TimeEntryResponse } from "../../mite/schemas.js";
import {
  noDefaultResponse,
  type NoDefaultResponse,
} from "../defaults/resolve.js";
import type { ToolDefinition, ToolRun } from "../types.js";
import { resolveMinutes, shapeEntry, type ShapedEntry } from "./entry.js";

const CreateInput = z.object({
  // Optional: when omitted, the id is pulled from the per-repo default for the
  // resolved scope (#9, ADR-0005). Both omitted is the dominant flow.
  project_id: z.number().optional(),
  service_id: z.number().optional(),
  minutes: z.number().optional(),
  hours: z.number().optional(),
  note: z.string().optional(),
  date_at: z.string().optional(),
  billable: z.boolean().optional(),
  /**
   * The scope key, normally resolved from the environment (ADR-0005) and
   * omitted by the agent. An explicit value is the not-built-now global-mode
   * bridge. Never forwarded into the mite payload.
   */
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
  | { created: false; preview: CreatePayload }
  | NoDefaultResponse;

/**
 * Assemble the create payload from resolved ids. `minutes`/`hours` collapse to
 * canonical minutes via the shared coercion; an omitted `date_at` stays omitted
 * so mite defaults it to today (no client-side date math, ADR-0003). `scope` is
 * never forwarded — it only selects the default (#9).
 */
const buildPayload = (
  input: CreateInput,
  ids: { project_id: number; service_id: number },
): CreatePayload => {
  const payload: CreatePayload = {
    project_id: ids.project_id,
    service_id: ids.service_id,
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
  let projectId = input.project_id;
  let serviceId = input.service_id;

  // Consult the per-repo default only when an id is missing — when both are
  // given, the defaults store is never touched (ADR-0005). store.get returns
  // null both when no scope resolves and when the scope has no stored default,
  // so a single check covers both no-default sub-cases.
  if (projectId === undefined || serviceId === undefined) {
    const fallback = await deps.getDefaults().get(input.scope);
    if (fallback === null) {
      return noDefaultResponse(deps);
    }
    projectId ??= fallback.project_id;
    serviceId ??= fallback.service_id;
  }

  const payload = buildPayload(input, {
    project_id: projectId,
    service_id: serviceId,
  });

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
    "hours (hours convert to minutes). project_id/service_id are optional: when " +
    "omitted they are filled from the per-repo default (set via set_default), " +
    "so the common flow needs no ids; if no default exists you get a structured " +
    "prompt to set one rather than an error. Omit date_at to log against today " +
    "— mite defaults it; this server never computes the date. Acts immediately; " +
    "pass preview:true to see what would be sent without writing. The success " +
    "response echoes the resolved project and service names so you can verify " +
    "what was logged.",
  inputSchema: CreateInput.shape,
  run: (input, deps) => createTimeEntry(input, deps),
};
