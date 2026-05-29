import { describe, expect, it, vi } from "vitest";

import { whoami } from "./whoami.tool.js";

describe("whoami", () => {
  it("returns the authenticated user and account name", async () => {
    const get = vi.fn(async (path: string) => {
      if (path === "/myself.json") {
        return {
          user: {
            id: 42,
            name: "Ada Lovelace",
            role: "admin",
            email: "ada@example.com",
          },
        };
      }
      if (path === "/account.json") {
        return { account: { id: 7, name: "acme", currency: "EUR" } };
      }
      throw new Error(`unexpected path ${path}`);
    });

    const result = await whoami({ get } as never);

    expect(result).toEqual({
      user: { id: 42, name: "Ada Lovelace", role: "admin" },
      account: { name: "acme" },
    });
  });
});
