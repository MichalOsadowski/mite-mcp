import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultsStore } from "../../mite/defaults.js";
import { createTimeEntry } from "./create-time-entry.tool.js";

type Post = (path: string, body: unknown) => Promise<unknown>;
const postFn = (impl: Post) => vi.fn<Post>(impl);

let defaultsBaseDir: string;
beforeEach(() => {
  defaultsBaseDir = mkdtempSync(join(tmpdir(), "mite-create-"));
});
afterEach(() => {
  rmSync(defaultsBaseDir, { recursive: true, force: true });
});

/** A real (temp-dir-backed) store whose scope resolves to a fixed git root. */
const storeWith = (gitRoot: string | null = "/repos/web") =>
  createDefaultsStore({
    baseDir: defaultsBaseDir,
    env: {},
    readGitRemote: () => null,
    readGitRoot: () => gitRoot,
  });

const depsWithStore = (
  post: ReturnType<typeof vi.fn>,
  store: ReturnType<typeof storeWith>,
) =>
  ({
    getClient: () => ({ get: vi.fn(), post }),
    getDefaults: () => store,
  }) as never;

const created = (overrides: Record<string, unknown> = {}) => ({
  time_entry: {
    id: 52324,
    minutes: 90,
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
    ...overrides,
  },
});

const depsWith = (post: ReturnType<typeof vi.fn>) =>
  ({ getClient: () => ({ get: vi.fn(), post }) }) as never;

describe("createTimeEntry", () => {
  it("POSTs a wrapped time_entry and echoes resolved project/service names", async () => {
    const post = postFn(async () => created());

    const result = await createTimeEntry(
      { project_id: 88309, service_id: 12984, minutes: 90, note: "work" },
      depsWith(post),
    );

    expect(post).toHaveBeenCalledTimes(1);
    const [path, body] = post.mock.calls[0]!;
    expect(path).toBe("/time_entries.json");
    expect(body).toEqual({
      time_entry: {
        project_id: 88309,
        service_id: 12984,
        minutes: 90,
        note: "work",
      },
    });
    if (!("created" in result)) throw new Error("expected a created entry");
    expect(result.created).toBe(true);
    if (!result.created) throw new Error("expected a created entry");
    expect(result.entry).toMatchObject({
      id: 52324,
      minutes: 90,
      hours: 1.5,
      project_name: "API Docs",
      service_name: "Writing",
    });
  });

  it("converts hours to minutes in the POST body", async () => {
    const post = postFn(async () => created({ minutes: 90 }));

    await createTimeEntry(
      { project_id: 88309, service_id: 12984, hours: 1.5 },
      depsWith(post),
    );

    const body = post.mock.calls[0]![1] as { time_entry: { minutes: number } };
    expect(body.time_entry.minutes).toBe(90);
  });

  it("omits date_at entirely when not given (mite defaults to today)", async () => {
    const post = postFn(async () => created());

    await createTimeEntry(
      { project_id: 88309, service_id: 12984, minutes: 90 },
      depsWith(post),
    );

    const body = post.mock.calls[0]![1] as {
      time_entry: Record<string, unknown>;
    };
    expect(body.time_entry).not.toHaveProperty("date_at");
  });

  it("passes date_at straight through when given (no client-side math)", async () => {
    const post = postFn(async () => created({ date_at: "2026-01-15" }));

    await createTimeEntry(
      {
        project_id: 88309,
        service_id: 12984,
        minutes: 90,
        date_at: "2026-01-15",
      },
      depsWith(post),
    );

    const body = post.mock.calls[0]![1] as {
      time_entry: { date_at?: string };
    };
    expect(body.time_entry.date_at).toBe("2026-01-15");
  });

  it("includes billable when given", async () => {
    const post = postFn(async () => created({ billable: false }));

    await createTimeEntry(
      { project_id: 88309, service_id: 12984, minutes: 90, billable: false },
      depsWith(post),
    );

    const body = post.mock.calls[0]![1] as {
      time_entry: { billable?: boolean };
    };
    expect(body.time_entry.billable).toBe(false);
  });

  it("preview:true returns a preview and writes nothing", async () => {
    const post = postFn(async () => created());

    const result = await createTimeEntry(
      {
        project_id: 88309,
        service_id: 12984,
        hours: 1.5,
        note: "work",
        preview: true,
      },
      depsWith(post),
    );

    expect(post).not.toHaveBeenCalled();
    if (!("preview" in result)) throw new Error("expected a preview");
    expect(result.created).toBe(false);
    if (result.created) throw new Error("expected a preview");
    expect(result.preview).toMatchObject({
      project_id: 88309,
      service_id: 12984,
      minutes: 90,
      note: "work",
    });
  });

  it("never forwards the scope field into the mite payload", async () => {
    const post = postFn(async () => created());

    await createTimeEntry(
      { project_id: 88309, service_id: 12984, minutes: 90, scope: "my-repo" },
      depsWith(post),
    );

    const body = post.mock.calls[0]![1] as {
      time_entry: Record<string, unknown>;
    };
    expect(body.time_entry).not.toHaveProperty("scope");
  });

  it("throws when neither minutes nor hours is given", async () => {
    const post = postFn(async () => created());

    await expect(
      createTimeEntry({ project_id: 88309, service_id: 12984 }, depsWith(post)),
    ).rejects.toThrow(/minutes.*hours/i);
    expect(post).not.toHaveBeenCalled();
  });

  describe("with per-repo defaults", () => {
    it("pulls project/service from the resolved default when both ids are omitted and echoes the names", async () => {
      const post = postFn(async () => created());
      const store = storeWith();
      await store.set(undefined, { project_id: 88309, service_id: 12984 });

      const result = await createTimeEntry(
        { minutes: 90, note: "work" },
        depsWithStore(post, store),
      );

      expect(post).toHaveBeenCalledTimes(1);
      const body = post.mock.calls[0]![1] as {
        time_entry: { project_id: number; service_id: number };
      };
      expect(body.time_entry.project_id).toBe(88309);
      expect(body.time_entry.service_id).toBe(12984);
      expect(result).toMatchObject({ created: true });
      if (!("created" in result) || !result.created) {
        throw new Error("expected a created entry");
      }
      expect(result.entry).toMatchObject({
        project_name: "API Docs",
        service_name: "Writing",
      });
    });

    it("fills only the omitted id from the default when one is given explicitly", async () => {
      const post = postFn(async () => created());
      const store = storeWith();
      await store.set(undefined, { project_id: 88309, service_id: 12984 });

      await createTimeEntry(
        { service_id: 555, minutes: 90 },
        depsWithStore(post, store),
      );

      const body = post.mock.calls[0]![1] as {
        time_entry: { project_id: number; service_id: number };
      };
      expect(body.time_entry.project_id).toBe(88309);
      expect(body.time_entry.service_id).toBe(555);
    });

    it("returns a structured, actionable no-default response when ids are omitted and no default exists", async () => {
      const post = postFn(async () => created());
      const store = storeWith();
      await store.set("other-repo", { project_id: 1, service_id: 2 });

      const result = await createTimeEntry(
        { minutes: 90 },
        depsWithStore(post, store),
      );

      expect(post).not.toHaveBeenCalled();
      expect(result).toMatchObject({ ok: false, reason: "no_default" });
      if (!("ok" in result)) throw new Error("expected a no-default response");
      expect(result.existing_scopes).toContain("other-repo");
      expect(result.message).toMatch(/set_default/i);
    });

    it("does not consult the defaults store when both ids are given", async () => {
      const post = postFn(async () => created());
      const store = storeWith();
      const getSpy = vi.spyOn(store, "get");

      await createTimeEntry(
        { project_id: 88309, service_id: 12984, minutes: 90 },
        depsWithStore(post, store),
      );

      expect(getSpy).not.toHaveBeenCalled();
      expect(post).toHaveBeenCalledTimes(1);
    });
  });
});
