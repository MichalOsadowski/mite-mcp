import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createDefaultsStore } from "../../mite/defaults.js";
import { clearDefault } from "./clear-default.tool.js";

const storeAt = (baseDir: string, gitRoot: string | null) =>
  createDefaultsStore({
    baseDir,
    env: {},
    readGitRemote: () => null,
    readGitRoot: () => gitRoot,
  });

const depsWith = (store: ReturnType<typeof storeAt>) => ({
  getClient: () => ({ get: vi.fn(), post: vi.fn() }),
  getDefaults: () => store,
});

describe("clearDefault", () => {
  it("removes the stored default for the resolved scope", async () => {
    const baseDir = mkdtempSync(join(tmpdir(), "mite-clear-"));
    const store = storeAt(baseDir, "/repos/web");
    await store.set(undefined, { project_id: 1, service_id: 2 });

    const result = await clearDefault({}, depsWith(store));

    expect(result).toEqual({ cleared: true, scope: "/repos/web" });
    expect(await store.get()).toBeNull();
  });

  it("returns a structured no-scope response when no key resolves", async () => {
    const baseDir = mkdtempSync(join(tmpdir(), "mite-clear-"));
    const store = storeAt(baseDir, null);
    const result = await clearDefault({}, depsWith(store));
    expect(result).toMatchObject({ cleared: false });
  });
});
