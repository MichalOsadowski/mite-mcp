import { describe, expect, it } from "vitest";

import { hoursToMinutes, minutesToHours, passthroughDate } from "./format.js";

describe("hoursToMinutes", () => {
  it("converts whole and fractional hours to integer minutes", () => {
    expect(hoursToMinutes(2)).toBe(120);
    expect(hoursToMinutes(1.5)).toBe(90);
    expect(hoursToMinutes(0.25)).toBe(15);
  });

  it("rounds to the nearest minute so mite never receives a fraction", () => {
    expect(hoursToMinutes(0.1)).toBe(6);
    expect(Number.isInteger(hoursToMinutes(1 / 3))).toBe(true);
  });
});

describe("minutesToHours", () => {
  it("surfaces minutes as hours rounded to two decimals", () => {
    expect(minutesToHours(90)).toBe(1.5);
    expect(minutesToHours(75)).toBe(1.25);
    expect(minutesToHours(20)).toBe(0.33);
  });
});

describe("passthroughDate", () => {
  it("passes mite keywords and ISO dates through unchanged", () => {
    expect(passthroughDate("today")).toBe("today");
    expect(passthroughDate("this_month")).toBe("this_month");
    expect(passthroughDate("2026-05-29")).toBe("2026-05-29");
  });

  it("leaves an omitted date undefined rather than computing today", () => {
    expect(passthroughDate(undefined)).toBeUndefined();
  });
});
