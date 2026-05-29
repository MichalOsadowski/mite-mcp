import { describe, expect, it, vi } from "vitest";

import { getTimeEntry } from "./get-time-entry.tool.js";

const entry = {
  id: 36159117,
  minutes: 120,
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

describe("getTimeEntry", () => {
  it("fetches a single entry by id and shapes minutes and hours", async () => {
    const get = vi.fn(async () => ({ time_entry: entry }));

    const result = await getTimeEntry({ id: 36159117 }, { get } as never);

    expect(get).toHaveBeenCalledWith(
      "/time_entries/36159117.json",
      expect.anything(),
    );
    expect(result.entry).toMatchObject({
      id: 36159117,
      minutes: 120,
      hours: 2,
      project_name: "API Docs",
      service_name: "Writing",
    });
  });
});
