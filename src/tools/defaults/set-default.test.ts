import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultsStore } from "../../mite/defaults.js";
import { setDefault } from "./set-default.tool.js";

const project = { project: { id: 88309, name: "API Docs" } };
const service = { service: { id: 12984, name: "Writing" } };

let baseDir: string;
beforeEach(() => {
  baseDir = mkdtempSync(join(tmpdir(), "mite-set-"));
});
afterEach(() => {
  rmSync(baseDir, { recursive: true, force: true });
});

const getFn = () =>
  vi.fn(async (path: string) => {
    if (path.startsWith("/projects/")) return project;
    if (path.startsWith("/services/")) return service;
    throw new Error(`unexpected path ${path}`);
  });

const storeWith = (gitRoot: string | null) =>
  createDefaultsStore({
    baseDir,
    env: {},
    readGitRemote: () => null,
    readGitRoot: () => gitRoot,
  });

const depsWith = (
  get: ReturnType<typeof getFn>,
  store: ReturnType<typeof storeWith>,
) =>
  ({
    getClient: () => ({ get, post: vi.fn() }),
    getDefaults: () => store,
  }) as never;

describe("setDefault", () => {
  it("stores the default and returns the resolved project and service names", async () => {
    const get = getFn();
    const store = storeWith("/repos/web");
    const setSpy = vi.spyOn(store, "set");

    const result = await setDefault(
      { project_id: 88309, service_id: 12984 },
      depsWith(get, store),
    );

    expect(setSpy).toHaveBeenCalledWith(undefined, {
      project_id: 88309,
      service_id: 12984,
    });
    expect(result).toEqual({
      scope: "/repos/web",
      project: { id: 88309, name: "API Docs" },
      service: { id: 12984, name: "Writing" },
    });
  });

  it("passes an explicit scope straight through to the store", async () => {
    const get = getFn();
    const store = storeWith(null);
    const setSpy = vi.spyOn(store, "set");

    await setDefault(
      { project_id: 88309, service_id: 12984, scope: "global-key" },
      depsWith(get, store),
    );

    expect(setSpy).toHaveBeenCalledWith("global-key", {
      project_id: 88309,
      service_id: 12984,
    });
  });

  it("returns a structured no-scope error rather than throwing an error dump", async () => {
    const get = getFn();
    const store = storeWith(null);

    const result = await setDefault(
      { project_id: 88309, service_id: 12984 },
      depsWith(get, store),
    );

    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).toMatch(/scope/i);
  });
});
