import { hoursToMinutes, minutesToHours } from "../../mite/format.js";
import type { TimeEntry } from "../../mite/schemas.js";

/**
 * The shared mechanism for the `time-entries/` module: entry shaping and the
 * minutes <-> hours coercion. Every tool in the module reuses this so the
 * canonical/convenience boundary (ADR-0003) lives in one place.
 */

/** A time entry shaped for tool output: canonical `minutes` + convenience `hours`. */
export interface ShapedEntry {
  id: number;
  minutes: number;
  hours: number;
  date_at: string;
  note: string;
  billable: boolean;
  project_id: number | null;
  project_name: string | null;
  service_id: number | null;
  service_name: string | null;
  customer_id: number | null;
  customer_name: string | null;
}

/** Shape a raw mite entry, surfacing both minutes (canonical) and hours (convenience). */
export const shapeEntry = (entry: TimeEntry): ShapedEntry => ({
  id: entry.id,
  minutes: entry.minutes,
  hours: minutesToHours(entry.minutes),
  date_at: entry.date_at,
  note: entry.note,
  billable: entry.billable,
  project_id: entry.project_id,
  project_name: entry.project_name,
  service_id: entry.service_id,
  service_name: entry.service_name,
  customer_id: entry.customer_id,
  customer_name: entry.customer_name,
});

/**
 * Resolve a duration to canonical minutes from a `minutes` or `hours` input.
 * Minutes win when both are given; throws when neither is. See ADR-0003.
 */
export const resolveMinutes = (input: {
  minutes?: number;
  hours?: number;
}): number => {
  if (input.minutes !== undefined) {
    return input.minutes;
  }
  if (input.hours !== undefined) {
    return hoursToMinutes(input.hours);
  }
  throw new Error("Provide either minutes or hours.");
};
