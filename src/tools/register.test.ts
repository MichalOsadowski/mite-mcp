import { describe, expect, it, vi } from "vitest";

import { MiteApiError } from "../mite/client.js";
import { createPingText, makeWhoamiHandler } from "./register.js";

describe("createPingText", () => {
  it("returns pong by default and echoes a provided message", () => {
    expect(createPingText()).toBe("pong");
    expect(createPingText("hi")).toBe("hi");
  });
});

describe("whoami tool handler", () => {
  it("returns the user and account as text content", async () => {
    const get = vi.fn(async (path: string) =>
      path === "/myself.json"
        ? { user: { id: 42, name: "Ada", role: "admin" } }
        : { account: { name: "acme" } },
    );

    const result = await makeWhoamiHandler(() => ({ get }) as never)();

    const text = result.content[0].text;
    expect(text).toContain("Ada");
    expect(text).toContain("acme");
    expect(result.isError).toBeFalsy();
  });

  it("surfaces a mite error as a clean message, not a raw dump", async () => {
    const handler = makeWhoamiHandler(() => {
      throw new MiteApiError(
        401,
        "auth",
        "mite authentication failed. Check MITE_ACCOUNT and MITE_API_KEY.",
      );
    });

    const result = await handler();

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("MITE_API_KEY");
  });
});
