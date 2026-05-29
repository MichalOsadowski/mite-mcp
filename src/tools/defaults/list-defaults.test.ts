import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createDefaultsStore } from "../../mite/defaults.js";
import { listDefaults } from "./list-defaults.tool.js";

describe("listDefaults", () => {
  it("returns every stored scope", async () => {
    const baseDir = mkdtempSync(join(tmpdir(), "mite-list-"));
    const store = createDefaultsStore({
      baseDir,
      env: {},
      readGitRemote: () => null,
      readGitRoot: () => null,
    });
    await store.set("alpha", { project_id: 1, service_id: 2 });
    await store.set("beta", { project_id: 3, service_id: 4 });

    const result = await listDefaults(
      {},
      {
        getClient: () => ({
          get: vi.fn(),
          post: vi.fn(),
          patch: vi.fn(),
          delete: vi.fn(),
        }),
        getDefaults: () => store,
      },
    );

    expect(result).toEqual({
      scopes: {
        alpha: { project_id: 1, service_id: 2 },
        beta: { project_id: 3, service_id: 4 },
      },
    });
  });
});
