import * as z from "zod/v4";

import type { MiteClient } from "../../mite/client.js";
import { minutesToHours } from "../../mite/format.js";

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

export interface ReportTimeInput {
  /**
   * One or more grouping dimensions (project, customer, service, user, day,
   * week, month, year), comma-separated. The order determines sort order.
   */
  group_by: string;
}

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
  const path = `/time_entries.json?group_by=${input.group_by}`;
  const groups = await client.get(path, ReportResponse);

  return groups.map(({ time_entry_group }) => {
    const { time_entries_params: _params, ...identity } = time_entry_group;
    return {
      ...identity,
      minutes: time_entry_group.minutes,
      hours: minutesToHours(time_entry_group.minutes),
      revenue: time_entry_group.revenue,
    };
  });
}
