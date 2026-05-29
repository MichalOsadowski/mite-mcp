import { describe, expect, it, vi } from "vitest";

import { reportTime, reportTimeTool } from "./report-time.tool.js";

describe("reportTime", () => {
  it("groups by a single dimension via group_by and reports minutes, hours, revenue", async () => {
    const get = vi.fn(async () => [
      {
        time_entry_group: {
          minutes: 480,
          revenue: 600.0,
          project_id: 1,
          project_name: "Acme Web",
          time_entries_params: { project_id: 1 },
        },
      },
      {
        time_entry_group: {
          minutes: 120,
          revenue: 150.0,
          project_id: 2,
          project_name: "Acme App",
          time_entries_params: { project_id: 2 },
        },
      },
    ]);

    const result = await reportTime({ group_by: "project" }, {
      getClient: () => ({ get }),
    } as never);

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

  it("passes combined groupings to group_by in order so that order controls sort, and carries every identity field per group", async () => {
    const get = vi.fn(async () => [
      {
        time_entry_group: {
          minutes: 300,
          revenue: 375.0,
          customer_id: 9,
          customer_name: "Acme",
          project_id: 1,
          project_name: "Acme Web",
        },
      },
    ]);

    const result = await reportTime({ group_by: "customer,project" }, {
      getClient: () => ({ get }),
    } as never);

    expect(get).toHaveBeenCalledWith(
      "/time_entries.json?group_by=customer%2Cproject",
      expect.anything(),
    );
    expect(result).toEqual([
      {
        customer_id: 9,
        customer_name: "Acme",
        project_id: 1,
        project_name: "Acme Web",
        minutes: 300,
        hours: 5,
        revenue: 375.0,
      },
    ]);
  });

  it("forwards the date range and scoping filters as query parameters, omitting unset ones", async () => {
    const get = vi.fn<(path: string) => Promise<unknown[]>>(async () => []);

    await reportTime(
      {
        group_by: "project",
        from: "2026-01-01",
        to: "2026-01-31",
        project_id: 1,
        customer_id: 9,
        service_id: 4,
        user_id: 26144,
        billable: true,
      },
      { getClient: () => ({ get }) } as never,
    );

    const path = get.mock.calls[0]![0] as string;
    const query = new URL(path, "https://acme.mite.de").searchParams;
    expect(Object.fromEntries(query)).toEqual({
      group_by: "project",
      from: "2026-01-01",
      to: "2026-01-31",
      project_id: "1",
      customer_id: "9",
      service_id: "4",
      user_id: "26144",
      billable: "true",
    });
  });

  it("forwards the `at` date keyword", async () => {
    const get = vi.fn<(path: string) => Promise<unknown[]>>(async () => []);

    await reportTime({ group_by: "day", at: "this_month" }, {
      getClient: () => ({ get }),
    } as never);

    const path = get.mock.calls[0]![0] as string;
    const query = new URL(path, "https://acme.mite.de").searchParams;
    expect(Object.fromEntries(query)).toEqual({
      group_by: "day",
      at: "this_month",
    });
  });
});

describe("reportTimeTool", () => {
  it("is named report_time and delegates run to the handler with the lazy client", async () => {
    expect(reportTimeTool.name).toBe("report_time");

    const get = vi.fn(async () => [
      { time_entry_group: { minutes: 60, revenue: 10, project_id: 1 } },
    ]);
    const getClient = vi.fn(() => ({ get }));

    const result = await reportTimeTool.run({ group_by: "project" }, {
      getClient,
    } as never);

    expect(getClient).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith(
      "/time_entries.json?group_by=project",
      expect.anything(),
    );
    expect(result).toEqual([
      { project_id: 1, minutes: 60, hours: 1, revenue: 10 },
    ]);
  });
});
