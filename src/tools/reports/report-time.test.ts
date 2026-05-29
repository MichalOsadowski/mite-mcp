import { describe, expect, it, vi } from "vitest";

import { reportTime } from "./report-time.tool.js";

describe("reportTime", () => {
  it("groups by a single dimension via group_by and reports minutes, hours, revenue", async () => {
    const get = vi.fn(async () => [
      {
        time_entry_group: {
          minutes: 480,
          revenue: 600.0,
          project_id: 1,
          project_name: "Acme Web",
        },
      },
      {
        time_entry_group: {
          minutes: 120,
          revenue: 150.0,
          project_id: 2,
          project_name: "Acme App",
        },
      },
    ]);

    const result = await reportTime({ group_by: "project" }, { get } as never);

    expect(get).toHaveBeenCalledWith(
      "/time_entries.json?group_by=project",
      expect.anything(),
    );
    expect(result).toEqual([
      {
        project_id: 1,
        project_name: "Acme Web",
        minutes: 480,
        hours: 8,
        revenue: 600.0,
      },
      {
        project_id: 2,
        project_name: "Acme App",
        minutes: 120,
        hours: 2,
        revenue: 150.0,
      },
    ]);
  });
});
