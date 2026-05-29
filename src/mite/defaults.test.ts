import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDefaultsStore, normalizeGitRemote } from "./defaults.js";

let baseDir: string;

beforeEach(() => {
  baseDir = mkdtempSync(join(tmpdir(), "mite-defaults-"));
});

afterEach(() => {
  rmSync(baseDir, { recursive: true, force: true });
});

/** Build a store whose environment inputs are fully injected (no real home/git). */
const storeWith = (
  inputs: {
    env?: Record<string, string | undefined>;
    gitRemote?: string | null;
    gitRoot?: string | null;
  } = {},
) =>
  createDefaultsStore({
    baseDir,
    env: inputs.env ?? {},
    readGitRemote: () => inputs.gitRemote ?? null,
    readGitRoot: () => inputs.gitRoot ?? null,
  });

describe("normalizeGitRemote", () => {
  it("maps https and ssh forms of the same repo to the same key", () => {
    const https = normalizeGitRemote("https://github.com/Acme/Web.git");
    const ssh = normalizeGitRemote("git@github.com:Acme/Web.git");
    expect(https).toBe(ssh);
  });

  it("strips protocol, host case, trailing .git, and trailing slashes", () => {
    expect(normalizeGitRemote("https://GitHub.com/Acme/Web/")).toBe(
      "github.com/acme/web",
    );
  });
});

describe("scope resolution priority chain", () => {
  it("prefers an explicit scope argument over everything else", () => {
    const store = storeWith({
      env: { MITE_DEFAULT_SCOPE: "from-env" },
      gitRemote: "https://github.com/acme/web.git",
      gitRoot: "/repos/web",
    });
    expect(store.resolveKey("explicit")).toBe("explicit");
  });

  it("falls back to MITE_DEFAULT_SCOPE when no explicit scope", () => {
    const store = storeWith({
      env: { MITE_DEFAULT_SCOPE: "from-env" },
      gitRemote: "https://github.com/acme/web.git",
      gitRoot: "/repos/web",
    });
    expect(store.resolveKey()).toBe("from-env");
  });

  it("falls back to the normalized git remote when no explicit scope or env", () => {
    const store = storeWith({
      gitRemote: "git@github.com:Acme/Web.git",
      gitRoot: "/repos/web",
    });
    expect(store.resolveKey()).toBe("github.com/acme/web");
  });

  it("falls back to the repo root path when there is no remote", () => {
    const store = storeWith({ gitRoot: "/repos/web" });
    expect(store.resolveKey()).toBe("/repos/web");
  });

  it("resolves to none (null) when nothing in the chain applies", () => {
    const store = storeWith({});
    expect(store.resolveKey()).toBeNull();
  });
});

describe("get / set / clear / list", () => {
  it("set then get round-trips the stored project/service for the resolved key", async () => {
    const store = storeWith({ gitRoot: "/repos/web" });
    await store.set(undefined, { project_id: 1, service_id: 2 });
    expect(await store.get()).toEqual({ project_id: 1, service_id: 2 });
  });

  it("get returns null when no default is stored for the resolved key", async () => {
    const store = storeWith({ gitRoot: "/repos/web" });
    expect(await store.get()).toBeNull();
  });

  it("get returns null when no scope key resolves at all", async () => {
    const store = storeWith({});
    expect(await store.get()).toBeNull();
  });

  it("clear removes a stored default", async () => {
    const store = storeWith({ gitRoot: "/repos/web" });
    await store.set(undefined, { project_id: 1, service_id: 2 });
    await store.clear();
    expect(await store.get()).toBeNull();
  });

  it("list returns every stored scope keyed by its key", async () => {
    const store = storeWith({});
    await store.set("alpha", { project_id: 1, service_id: 2 });
    await store.set("beta", { project_id: 3, service_id: 4 });
    expect(await store.list()).toEqual({
      alpha: { project_id: 1, service_id: 2 },
      beta: { project_id: 3, service_id: 4 },
    });
  });

  it("set throws a structured no-scope error when no key resolves", async () => {
    const store = storeWith({});
    await expect(
      store.set(undefined, { project_id: 1, service_id: 2 }),
    ).rejects.toThrow(/scope/i);
  });
});

describe("persistence and atomic write", () => {
  it("persists to defaults.json under the base dir", async () => {
    const store = storeWith({});
    await store.set("alpha", { project_id: 1, service_id: 2 });
    const raw = readFileSync(
      join(baseDir, "mite-mcp", "defaults.json"),
      "utf8",
    );
    expect(JSON.parse(raw)).toEqual({
      scopes: { alpha: { project_id: 1, service_id: 2 } },
    });
  });

  it("reads an existing file written by another process", async () => {
    const store = storeWith({});
    await store.set("alpha", { project_id: 1, service_id: 2 });
    // A second store instance over the same dir sees the persisted data.
    const other = storeWith({});
    expect(await other.list()).toEqual({
      alpha: { project_id: 1, service_id: 2 },
    });
  });

  it("does not leave a temp file behind after a write (atomic rename)", async () => {
    const store = storeWith({});
    await store.set("alpha", { project_id: 1, service_id: 2 });
    const { readdirSync } = await import("node:fs");
    const files = readdirSync(join(baseDir, "mite-mcp"));
    expect(files).toEqual(["defaults.json"]);
  });

  it("tolerates a malformed existing file by treating it as empty", async () => {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(baseDir, "mite-mcp"), { recursive: true });
    writeFileSync(join(baseDir, "mite-mcp", "defaults.json"), "not json{{");
    const store = storeWith({});
    expect(await store.list()).toEqual({});
  });
});
