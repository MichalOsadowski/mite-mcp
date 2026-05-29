import { describe, expect, it, vi } from "vitest";

import { MiteApiError } from "../../mite/client.js";
import { updateTimeEntry } from "./update-time-entry.tool.js";

const entry = (overrides: Record<string, unknown> = {}) => ({
  time_entry: {
    id: 7,
    minutes: 120,
    date_at: "2026-05-29",
    note: "updated note",
    billable: false,
    user_id: 211,
    project_id: 88309,
    project_name: "API Docs",
    service_id: 12984,
    service_name: "Writing",
    customer_id: 3213,
    customer_name: "King Inc.",
    ...overrides,
  },
});

type Patch = (path: string, body: unknown) => Promise<void>;
type Get = (path: string, schema: unknown) => Promise<unknown>;

const depsWith = (patch: ReturnType<typeof vi.fn>, get = vi.fn()) =>
  ({
    getClient: () => ({ get, post: vi.fn(), patch, delete: vi.fn() }),
  }) as never;

describe("updateTimeEntry", () => {
  it("dry-run by default: returns a preview and writes nothing", async () => {
    const patch = vi.fn<Patch>(async () => undefined);
    const get = vi.fn<Get>(async () => entry());

    const result = await updateTimeEntry(
      { id: 7, note: "updated note", minutes: 120 },
      depsWith(patch, get),
    );

    expect(patch).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(result.updated).toBe(false);
    if (result.updated) throw new Error("expected a preview");
    expect(result.preview).toEqual({
      id: 7,
      note: "updated note",
      minutes: 120,
    });
  });

  it("confirm:true PATCHes a partial wrapped time_entry with only provided fields", async () => {
    const patch = vi.fn<Patch>(async () => undefined);
    const get = vi.fn<Get>(async () => entry());

    const result = await updateTimeEntry(
      { id: 7, note: "updated note", confirm: true },
      depsWith(patch, get),
    );

    expect(patch).toHaveBeenCalledTimes(1);
    const [path, body] = patch.mock.calls[0]!;
    expect(path).toBe("/time_entries/7.json");
    expect(body).toEqual({ time_entry: { note: "updated note" } });
    expect(result.updated).toBe(true);
    if (!result.updated) throw new Error("expected an updated entry");
    expect(result.entry).toMatchObject({ id: 7, minutes: 120, hours: 2 });
  });

  it("confirm:true converts hours to minutes in the PATCH body", async () => {
    const patch = vi.fn<Patch>(async () => undefined);
    const get = vi.fn<Get>(async () => entry());

    await updateTimeEntry(
      { id: 7, hours: 2, confirm: true },
      depsWith(patch, get),
    );

    const body = patch.mock.calls[0]![1] as { time_entry: { minutes: number } };
    expect(body.time_entry.minutes).toBe(120);
  });

  it("confirm:true echoes the updated entry via a follow-up GET", async () => {
    const patch = vi.fn<Patch>(async () => undefined);
    const get = vi.fn<Get>(async () => entry());

    await updateTimeEntry(
      { id: 7, note: "updated note", confirm: true },
      depsWith(patch, get),
    );

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0]![0]).toBe("/time_entries/7.json");
  });

  it("does not include duration when neither minutes nor hours is given", async () => {
    const patch = vi.fn<Patch>(async () => undefined);
    const get = vi.fn<Get>(async () => entry());

    await updateTimeEntry(
      { id: 7, note: "just the note", confirm: true },
      depsWith(patch, get),
    );

    const body = patch.mock.calls[0]![1] as {
      time_entry: Record<string, unknown>;
    };
    expect(body.time_entry).not.toHaveProperty("minutes");
    expect(body.time_entry).toEqual({ note: "just the note" });
  });

  it("propagates a locked (423) error without swallowing it", async () => {
    const patch = vi.fn<Patch>(async () => {
      throw new MiteApiError(
        423,
        "locked",
        "mite entry is locked and cannot be changed.",
      );
    });

    const error = await Promise.resolve(
      updateTimeEntry({ id: 7, note: "x", confirm: true }, depsWith(patch)),
    ).then(
      () => {
        throw new Error("expected updateTimeEntry to reject");
      },
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(MiteApiError);
    expect((error as MiteApiError).kind).toBe("locked");
    expect((error as MiteApiError).status).toBe(423);
  });
});
