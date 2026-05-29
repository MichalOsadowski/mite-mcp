import { describe, expect, it, vi } from "vitest";

import { MiteApiError } from "../../mite/client.js";
import { deleteTimeEntry } from "./delete-time-entry.tool.js";

type Delete = (path: string) => Promise<void>;

const depsWith = (del: ReturnType<typeof vi.fn>) =>
  ({
    getClient: () => ({
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: del,
    }),
  }) as never;

describe("deleteTimeEntry", () => {
  it("dry-run by default: returns a preview and writes nothing", async () => {
    const del = vi.fn<Delete>(async () => undefined);

    const result = await deleteTimeEntry({ id: 7 }, depsWith(del));

    expect(del).not.toHaveBeenCalled();
    expect(result.deleted).toBe(false);
    if (result.deleted) throw new Error("expected a preview");
    expect(result.preview).toEqual({ id: 7 });
  });

  it("confirm:true DELETEs the entry by id and reports it deleted", async () => {
    const del = vi.fn<Delete>(async () => undefined);

    const result = await deleteTimeEntry(
      { id: 7, confirm: true },
      depsWith(del),
    );

    expect(del).toHaveBeenCalledTimes(1);
    expect(del.mock.calls[0]![0]).toBe("/time_entries/7.json");
    expect(result.deleted).toBe(true);
    if (!result.deleted) throw new Error("expected a deletion");
    expect(result.id).toBe(7);
  });

  it("propagates a locked (423) error without swallowing it", async () => {
    const del = vi.fn<Delete>(async () => {
      throw new MiteApiError(
        423,
        "locked",
        "mite entry is locked and cannot be changed.",
      );
    });

    const error = await Promise.resolve(
      deleteTimeEntry({ id: 7, confirm: true }, depsWith(del)),
    ).then(
      () => {
        throw new Error("expected deleteTimeEntry to reject");
      },
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(MiteApiError);
    expect((error as MiteApiError).kind).toBe("locked");
    expect((error as MiteApiError).status).toBe(423);
  });
});
