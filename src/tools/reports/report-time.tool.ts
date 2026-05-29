import * as z from "zod/v4";

import type { MiteClient } from "../../mite/client.js";
import { minutesToHours, passthroughDate } from "../../mite/format.js";
import type { ToolDefinition } from "../types.js";

/**
 * Permissive grouped-report schema. mite returns an array of envelopes, each a
 * `time_entry_group` carrying `minutes` and `revenue` plus dimension-specific
 * identity fields (e.g. `project_id`/`project_name`, or `from`/`to` for
 * temporal groupings). We validate only the two universally-present numeric
 * fields and let every identity field pass through untouched. See ADR-0003:
 * revenue is reported as mite computes it, never recomputed locally.
 */
const ReportResponse = z.array(
  z.looseObject({
    time_entry_group: z.looseObject({
      minutes: z.number(),
      revenue: z.number(),
    }),
  }),
);

export type ReportTimeInput = {
  /**
   * One or more grouping dimensions (project, customer, service, user, day,
   * week, month, year), comma-separated. The order determines sort order.
   */
  group_by: string;
  /** mite date keyword (`today`, `this_month`, …) or `YYYY-MM-DD`. */
  at?: string;
  /** Start of an explicit date range (keyword or `YYYY-MM-DD`). */
  from?: string;
  /** End of an explicit date range (keyword or `YYYY-MM-DD`). */
  to?: string;
  /** Scope to a single project. */
  project_id?: number;
  /** Scope to a single customer. */
  customer_id?: number;
  /** Scope to a single service. */
  service_id?: number;
  /** Scope to a single user. */
  user_id?: number;
  /** Restrict to billable (true) or non-billable (false) entries. */
  billable?: boolean;
};

/** A single grouped total: its identity fields plus minutes, hours, revenue. */
export type ReportGroup = Record<string, unknown> & {
  minutes: number;
  hours: number;
  revenue: number;
};

export async function reportTime(
  input: ReportTimeInput,
  client: Pick<MiteClient, "get">,
): Promise<ReportGroup[]> {
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
      revenue: time_entry_group.revenue,
    };
  });
}

export const reportTimeTool: ToolDefinition<ReportTimeInput> = {
  name: "report_time",
  title: "Report time",
  description:
    "Grouped time totals via mite's server-side group_by. Group by any of " +
    "project, customer, service, user, day, week, month, year — combine them " +
    "as a comma-separated list whose order controls sort. Each group reports " +
    "minutes, hours, and revenue (revenue as computed by mite). This is the " +
    "only sanctioned way to total time; never sum individual entries.",
  inputSchema: {
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
    from: z
      .string()
      .optional()
      .describe("Range start (keyword or YYYY-MM-DD)."),
    to: z.string().optional().describe("Range end (keyword or YYYY-MM-DD)."),
    project_id: z.number().optional().describe("Scope to a single project."),
    customer_id: z.number().optional().describe("Scope to a single customer."),
    service_id: z.number().optional().describe("Scope to a single service."),
    user_id: z.number().optional().describe("Scope to a single user."),
    billable: z
      .boolean()
      .optional()
      .describe("Restrict to billable (true) or non-billable (false) entries."),
  },
  run: (input, deps) => reportTime(input, deps.getClient()),
};
