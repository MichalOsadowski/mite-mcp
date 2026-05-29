import { describe, expect, it, vi } from "vitest";

import { findCustomer } from "./find-customer.tool.js";

describe("findCustomer", () => {
  it("queries by name and returns all candidates as { id, name }", async () => {
    const get = vi.fn(async () => [
      { customer: { id: 1, name: "Acme Corp" } },
      { customer: { id: 2, name: "Acme Subsidiary" } },
    ]);

    const result = await findCustomer({ name: "acme" }, {
      getClient: () => ({ get }),
    } as never);

    expect(get).toHaveBeenCalledWith(
      "/customers.json?name=acme",
      expect.anything(),
    );
    expect(result).toEqual([
      { id: 1, name: "Acme Corp" },
      { id: 2, name: "Acme Subsidiary" },
    ]);
  });

  it("excludes archived by default and merges both endpoints when included", async () => {
    const get = vi.fn(async (path: string) => {
      if (path === "/customers.json?name=acme") {
        return [{ customer: { id: 1, name: "Acme Corp" } }];
      }
      if (path === "/customers/archived.json?name=acme") {
        return [{ customer: { id: 9, name: "Old Acme" } }];
      }
      throw new Error(`unexpected path ${path}`);
    });

    const active = await findCustomer({ name: "acme" }, {
      getClient: () => ({ get }),
    } as never);
    expect(active).toEqual([{ id: 1, name: "Acme Corp" }]);

    const withArchived = await findCustomer(
      {
        name: "acme",
        includeArchived: true,
      },
      { getClient: () => ({ get }) } as never,
    );
    expect(withArchived).toEqual([
      { id: 1, name: "Acme Corp" },
      { id: 9, name: "Old Acme" },
    ]);
  });

  it("returns an empty array when nothing matches", async () => {
    const get = vi.fn(async () => []);

    const result = await findCustomer({ name: "nope" }, {
      getClient: () => ({ get }),
    } as never);

    expect(result).toEqual([]);
  });
});
