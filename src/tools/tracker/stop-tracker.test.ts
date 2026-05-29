import { describe, expect, it, vi } from "vitest";

import { stopTracker } from "./stop-tracker.tool.js";

const running = (id = 36135321) => ({
  tracker: {
    tracking_time_entry: {
      id,
      minutes: 247,
      since: "2026-05-29T17:05:04+02:00",
    },
  },
});

const none = () => ({ tracker: {} });

const stopped = (id = 36135321, minutes = 247) => ({
  tracker: { stopped_time_entry: { id, minutes } },
});

const depsWith = (
  overrides: Partial<{
    get: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  }> = {},
) =>
  ({
    getClient: () => ({
      get: overrides.get ?? vi.fn(),
      post: overrides.post ?? vi.fn(),
      patch: overrides.patch ?? vi.fn(),
      delete: overrides.delete ?? vi.fn(),
    }),
  }) as never;

describe("stopTracker", () => {
  it("with no id, resolves the running entry via GET and DELETEs it", async () => {
    const get = vi.fn(async () => running(36135321));
    const del = vi.fn(async () => stopped(36135321, 247));

    const result = await stopTracker({}, depsWith({ get, delete: del }));

    expect(get).toHaveBeenCalledWith("/tracker.json", expect.anything());
    expect(del).toHaveBeenCalledWith(
      "/tracker/36135321.json",
      expect.anything(),
    );
    expect(result).toEqual({
      stopped: true,
      entry: { id: 36135321, minutes: 247, hours: 4.12 },
    });
  });

  it("is idempotent: when nothing runs it is a no-op success and does not DELETE", async () => {
    const get = vi.fn(async () => none());
    const del = vi.fn();

    const result = await stopTracker({}, depsWith({ get, delete: del }));

    expect(del).not.toHaveBeenCalled();
    expect(result).toEqual({ stopped: false });
  });

  it("stops a specific entry by id without first resolving the running one", async () => {
    const get = vi.fn();
    const del = vi.fn(async () => stopped(99999, 5));

    const result = await stopTracker(
      { time_entry_id: 99999 },
      depsWith({ get, delete: del }),
    );

    expect(get).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalledWith("/tracker/99999.json", expect.anything());
    expect(result).toEqual({
      stopped: true,
      entry: { id: 99999, minutes: 5, hours: 0.08 },
    });
  });
});
