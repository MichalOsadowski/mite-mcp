import { describe, expect, it, vi } from "vitest";

import { listTimeEntries } from "./list-time-entries.tool.js";

const wrapped = (entry: Record<string, unknown>) => ({ time_entry: entry });

const entry = {
  id: 36159117,
  minutes: 90,
  date_at: "2026-05-29",
  note: "work",
  billable: true,
  user_id: 211,
  user_name: "Noah Scott",
  project_id: 88309,
  project_name: "API Docs",
  service_id: 12984,
  service_name: "Writing",
  customer_id: 3213,
  customer_name: "King Inc.",
};

describe("listTimeEntries", () => {
  it("returns entries shaped with both minutes and hours", async () => {
    const get = vi.fn(async () => [wrapped(entry)]);

    const result = await listTimeEntries({}, {
      getClient: () => ({ get }),
    } as never);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({ minutes: 90, hours: 1.5 });
  });

  it("passes documented filters straight through as query params", async () => {
    const get = vi.fn<(path: string) => Promise<unknown>>(async () => []);

    await listTimeEntries(
      {
        from: "2026-05-01",
        to: "2026-05-31",
        project_id: 88309,
        service_id: 12984,
        customer_id: 3213,
        user_id: "current",
        billable: true,
        note: "review",
        sort: "date",
        direction: "desc",
        limit: 50,
        page: 2,
      },
      { getClient: () => ({ get }) } as never,
    );

    const path = get.mock.calls[0]![0];
    expect(path.startsWith("/time_entries.json?")).toBe(true);
    const params = new URLSearchParams(path.split("?")[1]);
    expect(params.get("from")).toBe("2026-05-01");
    expect(params.get("to")).toBe("2026-05-31");
    expect(params.get("project_id")).toBe("88309");
    expect(params.get("service_id")).toBe("12984");
    expect(params.get("customer_id")).toBe("3213");
    expect(params.get("user_id")).toBe("current");
    expect(params.get("billable")).toBe("true");
    expect(params.get("note")).toBe("review");
    expect(params.get("sort")).toBe("date");
    expect(params.get("direction")).toBe("desc");
    expect(params.get("limit")).toBe("50");
    expect(params.get("page")).toBe("2");
  });

  it("passes the `at` filter through", async () => {
    const get = vi.fn<(path: string) => Promise<unknown>>(async () => []);

    await listTimeEntries({ at: "today" }, {
      getClient: () => ({ get }),
    } as never);

    const path = get.mock.calls[0]![0];
    expect(new URLSearchParams(path.split("?")[1]).get("at")).toBe("today");
  });

  it("omits unset filters", async () => {
    const get = vi.fn<(path: string) => Promise<unknown>>(async () => []);

    await listTimeEntries({}, { getClient: () => ({ get }) } as never);

    expect(get.mock.calls[0]![0]).toBe("/time_entries.json");
  });
});
