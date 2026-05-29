import { describe, expect, it, vi } from "vitest";

import { startTracker } from "./start-tracker.tool.js";

const started = (id = 36135321, overrides: Record<string, unknown> = {}) => ({
  tracker: {
    tracking_time_entry: {
      id,
      minutes: 0,
      since: "2026-05-29T17:33:52+02:00",
      ...overrides,
    },
  },
});

const createdEntry = (id = 52324) => ({
  time_entry: {
    id,
    minutes: 0,
    date_at: "2026-05-29",
    note: "work",
    billable: true,
    user_id: 211,
    project_id: 88309,
    project_name: "API Docs",
    service_id: 12984,
    service_name: "Writing",
    customer_id: 3213,
    customer_name: "King Inc.",
  },
});

type Post = (path: string, body: unknown, schema: unknown) => Promise<unknown>;
const postFn = (impl: Post) => vi.fn<Post>(impl);

const depsWith = (
  overrides: Partial<{
    get: ReturnType<typeof postFn>;
    // tracker start uses the bodyless+schema PATCH overload: (path, undefined, schema)
    patch: ReturnType<typeof postFn>;
    delete: ReturnType<typeof postFn>;
    post: ReturnType<typeof postFn>;
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

describe("startTracker", () => {
  it("PATCHes /tracker/:id.json for an existing entry and returns the running state", async () => {
    const patch = postFn(async () => started(36135321));

    const result = await startTracker(
      { time_entry_id: 36135321 },
      depsWith({ patch }),
    );

    expect(patch).toHaveBeenCalledWith(
      "/tracker/36135321.json",
      undefined,
      expect.anything(),
    );
    expect(result).toEqual({
      running: true,
      entry: {
        id: 36135321,
        minutes: 0,
        hours: 0,
        since: "2026-05-29T17:33:52+02:00",
      },
    });
  });

  it("create-then-start: POSTs a new entry, then PATCHes the tracker against it", async () => {
    const post = postFn(async () => createdEntry(52324));
    const patch = postFn(async () => started(52324));

    const result = await startTracker(
      { project_id: 88309, service_id: 12984, minutes: 90, note: "work" },
      depsWith({ post, patch }),
    );

    expect(post).toHaveBeenCalledTimes(1);
    const [postPath, postBody] = post.mock.calls[0]!;
    expect(postPath).toBe("/time_entries.json");
    expect(postBody).toEqual({
      time_entry: {
        project_id: 88309,
        service_id: 12984,
        minutes: 90,
        note: "work",
      },
    });
    expect(patch).toHaveBeenCalledWith(
      "/tracker/52324.json",
      undefined,
      expect.anything(),
    );
    expect(result).toEqual({
      running: true,
      entry: {
        id: 52324,
        minutes: 0,
        hours: 0,
        since: "2026-05-29T17:33:52+02:00",
      },
    });
  });

  it("converts hours to minutes in the create-then-start POST body", async () => {
    const post = postFn(async () => createdEntry(52324));
    const patch = postFn(async () => started(52324));

    await startTracker(
      { project_id: 88309, service_id: 12984, hours: 1.5 },
      depsWith({ post, patch }),
    );

    const body = post.mock.calls[0]![1] as { time_entry: { minutes: number } };
    expect(body.time_entry.minutes).toBe(90);
  });

  it("time_entry_id wins when both an id and create fields are given (no create)", async () => {
    const post = postFn(async () => createdEntry(99999));
    const patch = postFn(async () => started(36135321));

    await startTracker(
      {
        time_entry_id: 36135321,
        project_id: 88309,
        service_id: 12984,
        minutes: 90,
      },
      depsWith({ post, patch }),
    );

    expect(post).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalledWith(
      "/tracker/36135321.json",
      undefined,
      expect.anything(),
    );
  });

  it("throws when neither an id nor create fields are given", async () => {
    const post = vi.fn();
    const patch = vi.fn();

    await expect(startTracker({}, depsWith({ post, patch }))).rejects.toThrow(
      /time_entry_id|project_id/i,
    );
    expect(post).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });
});
