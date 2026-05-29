import { describe, expect, it, vi } from "vitest";

import { createDefaultsStore } from "../../mite/defaults.js";
import { getDefault } from "./get-default.tool.js";

const storeWith = (
  inputs: { gitRoot?: string | null; baseDir: string } = { baseDir: "/x" },
) =>
  createDefaultsStore({
    baseDir: inputs.baseDir,
    env: {},
    readGitRemote: () => null,
    readGitRoot: () => inputs.gitRoot ?? null,
  });

const depsWith = (store: ReturnType<typeof storeWith>) => ({
  getClient: () => ({ get: vi.fn(), post: vi.fn() }),
  getDefaults: () => store,
});

describe("getDefault", () => {
  it("returns the stored default and its resolved scope key", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const baseDir = mkdtempSync(join(tmpdir(), "mite-get-"));
    const store = storeWith({ baseDir, gitRoot: "/repos/web" });
    await store.set(undefined, { project_id: 1, service_id: 2 });

    const result = await getDefault({}, depsWith(store));

    expect(result).toEqual({
      found: true,
      scope: "/repos/web",
      default: { project_id: 1, service_id: 2 },
    });
  });

  it("returns a structured no-default response when none is set", async () => {
    const store = storeWith({ baseDir: "/x", gitRoot: "/repos/web" });
    const result = await getDefault({}, depsWith(store));
    expect(result).toMatchObject({ found: false });
  });
});
