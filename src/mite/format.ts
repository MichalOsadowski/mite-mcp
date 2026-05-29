/** Convert convenience hours to mite's canonical integer minutes. */
export const hoursToMinutes = (hours: number): number => Math.round(hours * 60);

/** Surface canonical minutes as hours, rounded to two decimals for display. */
export const minutesToHours = (minutes: number): number =>
  Math.round((minutes / 60) * 100) / 100;

/**
 * Pass a date through to mite untouched. mite accepts keywords (`today`,
 * `this_month`, …) and `YYYY-MM-DD`. We never compute "today" client-side — an
 * omitted (undefined) date stays undefined so mite defaults it. See ADR-0003.
 */
export const passthroughDate = (date?: string): string | undefined => date;
