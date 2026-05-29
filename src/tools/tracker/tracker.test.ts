import { describe, expect, it, vi } from "vitest";

import { getTracker } from "./get-tracker.tool.js";

const running = (overrides: Record<string, unknown> = {}) => ({
  tracker: {
    tracking_time_entry: {
      id: 36135321,
      minutes: 247,
      since: "2026-05-29T17:05:04+02:00",
      ...overrides,
    },
  },
});

const none = () => ({ tracker: {} });

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

describe("getTracker", () => {
  it("reports the running entry from /tracker.json", async () => {
    const get = vi.fn(async () => running());

    const result = await getTracker({}, depsWith({ get }));

    expect(get).toHaveBeenCalledWith("/tracker.json", expect.anything());
    expect(result).toEqual({
      running: true,
      entry: {
        id: 36135321,
        minutes: 247,
        hours: 4.12,
        since: "2026-05-29T17:05:04+02:00",
      },
    });
  });

  it("reports none when nothing runs", async () => {
    const get = vi.fn(async () => none());

    const result = await getTracker({}, depsWith({ get }));

    expect(result).toEqual({ running: false });
  });
});
