import { describe, expect, it, vi } from "vitest";

import { findService } from "./find-service.tool.js";

describe("findService", () => {
  it("queries by name and returns all candidates as { id, name }", async () => {
    const get = vi.fn(async () => [
      { service: { id: 1, name: "Development" } },
      { service: { id: 2, name: "Web Development" } },
    ]);

    const result = await findService({ get } as never, { name: "develop" });

    expect(get).toHaveBeenCalledWith(
      "/services.json?name=develop",
      expect.anything(),
    );
    expect(result).toEqual([
      { id: 1, name: "Development" },
      { id: 2, name: "Web Development" },
    ]);
  });

  it("excludes archived by default and merges both endpoints when included", async () => {
    const get = vi.fn(async (path: string) => {
      if (path === "/services.json?name=dev") {
        return [{ service: { id: 1, name: "Development" } }];
      }
      if (path === "/services/archived.json?name=dev") {
        return [{ service: { id: 9, name: "Legacy Dev" } }];
      }
      throw new Error(`unexpected path ${path}`);
    });

    const active = await findService({ get } as never, { name: "dev" });
    expect(active).toEqual([{ id: 1, name: "Development" }]);

    const withArchived = await findService({ get } as never, {
      name: "dev",
      includeArchived: true,
    });
    expect(withArchived).toEqual([
      { id: 1, name: "Development" },
      { id: 9, name: "Legacy Dev" },
    ]);
  });

  it("returns an empty array when nothing matches", async () => {
    const get = vi.fn(async () => []);

    const result = await findService({ get } as never, { name: "nope" });

    expect(result).toEqual([]);
  });
});
