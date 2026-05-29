import { describe, expect, it, vi } from "vitest";

import { MiteApiError } from "../mite/client.js";
import { toHandler } from "./register.js";
import type { ToolDefinition, ToolDeps } from "./types.js";
import { whoamiTool } from "./whoami/whoami.tool.js";

const AUTH_MESSAGE =
  "mite authentication failed. Check MITE_ACCOUNT and MITE_API_KEY.";

const stubTool = (run: ToolDefinition["run"]): ToolDefinition => ({
  name: "stub",
  title: "Stub",
  description: "",
  inputSchema: {},
  run,
});

// Tools below never touch the client, so the deps are an unused stub.
const noDeps = { getClient: () => ({ get: vi.fn() }) } as unknown as ToolDeps;

describe("toHandler", () => {
  it("passes a string result through as text", async () => {
    const result = await toHandler(
      stubTool(() => "pong"),
      noDeps,
    )({});

    expect(result.content[0].text).toBe("pong");
    expect(result.isError).toBeFalsy();
  });

  it("pretty-prints an object result as JSON", async () => {
    const result = await toHandler(
      stubTool(() => ({ a: 1 })),
      noDeps,
    )({});

    expect(result.content[0].text).toBe(JSON.stringify({ a: 1 }, null, 2));
    expect(result.isError).toBeFalsy();
  });

  it("surfaces a MiteApiError as its clean message and flags isError", async () => {
    const result = await toHandler(
      stubTool(() => {
        throw new MiteApiError(401, "auth", AUTH_MESSAGE);
      }),
      noDeps,
    )({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("MITE_API_KEY");
  });

  it("hides an unexpected error behind a generic message", async () => {
    const result = await toHandler(
      stubTool(() => {
        throw new Error("RAW_LEAK");
      }),
      noDeps,
    )({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Unexpected error talking to mite.");
    expect(result.content[0].text).not.toContain("RAW_LEAK");
  });
});

describe("whoami tool through the adapter", () => {
  it("returns the authenticated user and account as text content", async () => {
    const get = vi.fn(async (path: string) =>
      path === "/myself.json"
        ? { user: { id: 42, name: "Ada", role: "admin" } }
        : { account: { name: "acme" } },
    );
    const deps = { getClient: () => ({ get }) } as unknown as ToolDeps;

    const result = await toHandler(whoamiTool, deps)({});

    expect(result.content[0].text).toContain("Ada");
    expect(result.content[0].text).toContain("acme");
    expect(result.isError).toBeFalsy();
  });

  it("surfaces a response-shape mismatch as a clean message, not a raw dump", async () => {
    const deps = {
      getClient: () => ({
        get: async () => {
          throw new MiteApiError(
            200,
            "shape",
            "mite returned an unexpected response shape.",
          );
        },
      }),
    } as unknown as ToolDeps;

    const result = await toHandler(whoamiTool, deps)({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      "mite returned an unexpected response shape.",
    );
  });

  it("surfaces a mite 401 as a clean message, not a raw dump", async () => {
    const deps = {
      getClient: () => ({
        get: async () => {
          throw new MiteApiError(401, "auth", AUTH_MESSAGE);
        },
      }),
    } as unknown as ToolDeps;

    const result = await toHandler(whoamiTool, deps)({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("MITE_API_KEY");
  });
});
