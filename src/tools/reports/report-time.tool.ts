import * as z from "zod/v4";

import { minutesToHours, passthroughDate } from "../../mite/format.js";
import { UserIdFilter } from "../../mite/schemas.js";
import type { ToolDefinition, ToolRun } from "../types.js";

/**
 * Permissive grouped-report schema. mite returns an array of envelopes, each a
 * `time_entry_group` carrying `minutes` and `revenue` plus dimension-specific
 * identity fields (e.g. `project_id`/`project_name`, or `from`/`to` for
 * temporal groupings). We validate only `minutes` and `revenue` and let every
 * identity field pass through untouched. See ADR-0003: revenue is reported as
 * mite computes it, never recomputed locally.
 *
 * `revenue` is `nullish`: mite sends `revenue: null` for every group whenever it
 * computes no revenue (e.g. entries with no rate), which used to shape-error the
 * whole report. `nullish` rather than `nullable` so an omitted key survives too;
 * only `null` has been observed.
 */
const ReportResponse = z.array(
  z.looseObject({
    time_entry_group: z.looseObject({
      minutes: z.number(),
      revenue: z.number().nullish(),
    }),
  }),
);

/**
 * The tool's input, defined once. The zod schema is the single source of truth:
 * the TS type is inferred from it and `inputSchema` exposes its shape.
 */
const ReportTimeInput = z.object({
  group_by: z
    .string()
    .describe(
      "Comma-separated grouping dimensions (project, customer, service, " +
        "user, day, week, month, year); order determines sort.",
    ),
  at: z
    .string()
    .optional()
    .describe("Date keyword (today, this_month, …) or YYYY-MM-DD."),
  from: z.string().optional().describe("Range start (keyword or YYYY-MM-DD)."),
  to: z.string().optional().describe("Range end (keyword or YYYY-MM-DD)."),
  project_id: z.number().optional().describe("Scope to a single project."),
  customer_id: z.number().optional().describe("Scope to a single customer."),
  service_id: z.number().optional().describe("Scope to a single service."),
  user_id: UserIdFilter.optional().describe(
    "Scope to a single user id, or 'current' for the authenticated user.",
  ),
  billable: z
    .boolean()
    .optional()
    .describe("Restrict to billable (true) or non-billable (false) entries."),
});
export type ReportTimeInput = z.infer<typeof ReportTimeInput>;

/**
 * A single grouped total: its identity fields plus minutes, hours, revenue.
 * `revenue` is `null` when mite computed none — not zero earned.
 */
export type ReportGroup = Record<string, unknown> & {
  minutes: number;
  hours: number;
  revenue: number | null;
};

export const reportTime: ToolRun<ReportTimeInput, ReportGroup[]> = async (
  input,
  deps,
) => {
  const client = deps.getClient();
  const query = new URLSearchParams({ group_by: input.group_by });
  const filters: Record<string, string | undefined> = {
    at: passthroughDate(input.at),
    from: passthroughDate(input.from),
    to: passthroughDate(input.to),
    project_id: input.project_id?.toString(),
    customer_id: input.customer_id?.toString(),
    service_id: input.service_id?.toString(),
    user_id: input.user_id?.toString(),
    billable: input.billable?.toString(),
  };
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) query.set(key, value);
  }
  const groups = await client.get(
    `/time_entries.json?${query.toString()}`,
    ReportResponse,
  );

  return groups.map(({ time_entry_group }) => {
    // Drop mite's internal filter echo; pass every identity field through.
    const identity = { ...time_entry_group };
    delete identity.time_entries_params;
    return {
      ...identity,
      minutes: time_entry_group.minutes,
      hours: minutesToHours(time_entry_group.minutes),
      // Normalise an absent revenue to an explicit null; never recomputed here.
      revenue: time_entry_group.revenue ?? null,
    };
  });
};

export const reportTimeTool: ToolDefinition<ReportTimeInput> = {
  name: "report_time",
  title: "Report time",
  description:
    "Grouped time totals via mite's server-side group_by. Group by any of " +
    "project, customer, service, user, day, week, month, year — combine them " +
    "as a comma-separated list whose order controls sort. Scope with the same " +
    "date and id filters as list_time_entries (user_id accepts 'current'), " +
    "but no paging or sorting options. Each group " +
    "reports minutes, hours, and revenue (revenue as computed by mite). Revenue is " +
    "null when mite computed none for the group (e.g. no rate on the " +
    "entries) — that means unknown, not zero earned. This is the only " +
    "sanctioned way to total time; never sum individual entries.",
  inputSchema: ReportTimeInput.shape,
  run: reportTime,
};
