import { describe, expect, it } from "vitest";

import type { TimeEntry } from "../../mite/schemas.js";
import { resolveMinutes, shapeEntry } from "./entry.js";

const raw: TimeEntry = {
  id: 1,
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
};

describe("shapeEntry", () => {
  it("surfaces both canonical minutes and convenience hours", () => {
    const shaped = shapeEntry(raw);
    expect(shaped.minutes).toBe(90);
    expect(shaped.hours).toBe(1.5);
  });

  it("carries the consumed identity and name fields", () => {
    const shaped = shapeEntry(raw);
    expect(shaped).toMatchObject({
      id: 1,
      date_at: "2026-05-29",
      note: "work",
      billable: true,
      project_id: 88309,
      project_name: "API Docs",
      service_id: 12984,
      service_name: "Writing",
      customer_id: 3213,
      customer_name: "King Inc.",
    });
  });
});

describe("resolveMinutes", () => {
  it("passes minutes through when given", () => {
    expect(resolveMinutes({ minutes: 45 })).toBe(45);
  });

  it("converts hours to minutes when only hours is given", () => {
    expect(resolveMinutes({ hours: 1.5 })).toBe(90);
  });

  it("prefers minutes when both are given", () => {
    expect(resolveMinutes({ minutes: 30, hours: 2 })).toBe(30);
  });

  it("throws when neither minutes nor hours is given", () => {
    expect(() => resolveMinutes({})).toThrow(/minutes.*hours/i);
  });
});
