import { describe, expect, it, vi } from "vitest";

import { findProject } from "./find-project.tool.js";

describe("findProject", () => {
  it("queries by name and returns candidates with parent customer fields", async () => {
    const get = vi.fn(async () => [
      {
        project: {
          id: 1,
          name: "Website Redesign",
          customer_id: 10,
          customer_name: "Acme Corp",
        },
      },
      {
        project: {
          id: 2,
          name: "Website Maintenance",
          customer_id: 11,
          customer_name: "Globex",
        },
      },
    ]);

    const result = await findProject({ get } as never, { name: "website" });

    expect(get).toHaveBeenCalledWith(
      "/projects.json?name=website",
      expect.anything(),
    );
    expect(result).toEqual([
      {
        id: 1,
        name: "Website Redesign",
        customer_id: 10,
        customer_name: "Acme Corp",
      },
      {
        id: 2,
        name: "Website Maintenance",
        customer_id: 11,
        customer_name: "Globex",
      },
    ]);
  });

  it("delegates customer narrowing to mite via the customer_id query param", async () => {
    // mite narrows server-side, so the response already contains only the
    // requested customer's projects; we return it as-is, not re-filtered.
    const get = vi.fn(async () => [
      {
        project: {
          id: 1,
          name: "Website Redesign",
          customer_id: 10,
          customer_name: "Acme Corp",
        },
      },
    ]);

    const result = await findProject({ get } as never, {
      name: "website",
      customer_id: 10,
    });

    expect(get).toHaveBeenCalledWith(
      "/projects.json?name=website&customer_id=10",
      expect.anything(),
    );
    expect(result).toEqual([
      {
        id: 1,
        name: "Website Redesign",
        customer_id: 10,
        customer_name: "Acme Corp",
      },
    ]);
  });

  it("carries customer_id on both active and archived paths", async () => {
    const get = vi.fn(async (path: string) => {
      if (path === "/projects.json?name=site&customer_id=10") {
        return [
          {
            project: {
              id: 1,
              name: "Site A",
              customer_id: 10,
              customer_name: "Acme Corp",
            },
          },
        ];
      }
      if (path === "/projects/archived.json?name=site&customer_id=10") {
        return [
          {
            project: {
              id: 9,
              name: "Old Site",
              customer_id: 10,
              customer_name: "Acme Corp",
            },
          },
        ];
      }
      throw new Error(`unexpected path ${path}`);
    });

    const result = await findProject({ get } as never, {
      name: "site",
      includeArchived: true,
      customer_id: 10,
    });

    expect(get).toHaveBeenCalledWith(
      "/projects.json?name=site&customer_id=10",
      expect.anything(),
    );
    expect(get).toHaveBeenCalledWith(
      "/projects/archived.json?name=site&customer_id=10",
      expect.anything(),
    );
    expect(result.map((p) => p.id)).toEqual([1, 9]);
  });

  it("excludes archived by default and merges both endpoints when included", async () => {
    const get = vi.fn(async (path: string) => {
      if (path === "/projects.json?name=site") {
        return [
          {
            project: {
              id: 1,
              name: "Site A",
              customer_id: 10,
              customer_name: "Acme Corp",
            },
          },
        ];
      }
      if (path === "/projects/archived.json?name=site") {
        return [
          {
            project: {
              id: 9,
              name: "Old Site",
              customer_id: 10,
              customer_name: "Acme Corp",
            },
          },
        ];
      }
      throw new Error(`unexpected path ${path}`);
    });

    const active = await findProject({ get } as never, { name: "site" });
    expect(active.map((p) => p.id)).toEqual([1]);

    const withArchived = await findProject({ get } as never, {
      name: "site",
      includeArchived: true,
    });
    expect(withArchived.map((p) => p.id)).toEqual([1, 9]);
  });

  it("normalizes a customer-less project to null parent fields", async () => {
    const get = vi.fn(async () => [
      { project: { id: 3, name: "Internal R&D" } },
    ]);

    const result = await findProject({ get } as never, { name: "internal" });

    expect(result).toEqual([
      { id: 3, name: "Internal R&D", customer_id: null, customer_name: null },
    ]);
  });

  it("returns an empty array when nothing matches", async () => {
    const get = vi.fn(async () => []);

    const result = await findProject({ get } as never, { name: "nope" });

    expect(result).toEqual([]);
  });
});
