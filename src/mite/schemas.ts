import * as z from "zod/v4";

/**
 * Permissive schemas: we validate only the fields this server consumes and let
 * mite send whatever else it likes. This keeps us robust to upstream shape
 * changes (extra or unexpected fields never break a read).
 */

export const MiteUser = z.looseObject({
  id: z.number(),
  name: z.string(),
  role: z.string(),
});

export const Myself = z.looseObject({
  user: MiteUser,
});

export const MiteAccount = z.looseObject({
  name: z.string(),
});

export const AccountResponse = z.looseObject({
  account: MiteAccount,
});

export type MiteUser = z.infer<typeof MiteUser>;
export type MiteAccount = z.infer<typeof MiteAccount>;

/**
 * The `user_id` filter, shared by every tool that scopes a read to one user.
 * mite accepts either a numeric id or the `current` keyword for the
 * authenticated user, so the two shapes live here once rather than drifting
 * apart per tool (`list_time_entries` and `report_time` both use it).
 */
export const UserIdFilter = z.union([z.number(), z.literal("current")]);

/**
 * A mite time entry. Permissive (`z.looseObject`): we validate only the fields
 * this server consumes — mite may send more. Names (`project_name`,
 * `service_name`, `customer_name`) are nullable upstream when the entry has no
 * associated project/customer. Shared by the read tools (#4) and create (#6);
 * `create_time_entry` echoes the resolved `project_name`/`service_name` from the
 * create response, so they live here.
 */
export const TimeEntry = z.looseObject({
  id: z.number(),
  minutes: z.number(),
  date_at: z.string(),
  note: z.string(),
  billable: z.boolean(),
  user_id: z.number(),
  project_id: z.number().nullable(),
  project_name: z.string().nullable(),
  service_id: z.number().nullable(),
  service_name: z.string().nullable(),
  customer_id: z.number().nullable(),
  customer_name: z.string().nullable(),
});

/** mite wraps each entry in a `time_entry` key (single + create responses). */
export const TimeEntryResponse = z.looseObject({
  time_entry: TimeEntry,
});

/** The list endpoint returns an array of wrapped entries. */
export const TimeEntryListResponse = z.array(TimeEntryResponse);

export type TimeEntry = z.infer<typeof TimeEntry>;

/**
 * The tracker's running entry. mite reports only `id`, `minutes`, and `since`
 * (start timestamp) for the timer — not the full time entry — so this is its
 * own slim, permissive schema rather than `TimeEntry`.
 */
export const TrackingTimeEntry = z.looseObject({
  id: z.number(),
  minutes: z.number(),
  since: z.string(),
});

/** mite reports a stopped entry as just an id + the accumulated minutes. */
export const StoppedTimeEntry = z.looseObject({
  id: z.number(),
  minutes: z.number(),
});

/**
 * The tracker envelope. Both inner keys are optional: `{ tracker: {} }` means
 * nothing runs; a start returns `tracking_time_entry` (plus `stopped_time_entry`
 * when switching from another entry); a stop returns `stopped_time_entry`.
 */
export const TrackerResponse = z.looseObject({
  tracker: z.looseObject({
    tracking_time_entry: TrackingTimeEntry.optional(),
    stopped_time_entry: StoppedTimeEntry.optional(),
  }),
});

export type TrackingTimeEntry = z.infer<typeof TrackingTimeEntry>;
export type StoppedTimeEntry = z.infer<typeof StoppedTimeEntry>;
export type TrackerResponse = z.infer<typeof TrackerResponse>;

/**
 * Lookup resources. mite's list endpoints return an array of single-key-wrapped
 * objects — e.g. `[{ "project": { … } }, …]` — so each resource has an inner
 * schema (validate only the fields we consume) and a response schema for the
 * wrapped array, which is what we hand to `client.get`.
 */

export const Project = z.looseObject({
  id: z.number(),
  name: z.string(),
  // A project may have no customer; mite may send null or omit the key, so allow
  // both (nullable + optional) to keep customer-less projects from shape-erroring.
  customer_id: z.number().nullish(),
  customer_name: z.string().nullish(),
});

export const Service = z.looseObject({
  id: z.number(),
  name: z.string(),
});

export const Customer = z.looseObject({
  id: z.number(),
  name: z.string(),
});

export const ProjectsResponse = z.array(z.looseObject({ project: Project }));
export const ServicesResponse = z.array(z.looseObject({ service: Service }));
export const CustomersResponse = z.array(z.looseObject({ customer: Customer }));

/**
 * Single-resource responses for by-id lookups (`/projects/{id}.json`,
 * `/services/{id}.json`). `set_default` uses these to echo the resolved names
 * for the ids it stores without creating a time entry.
 */
export const ProjectResponse = z.looseObject({ project: Project });
export const ServiceResponse = z.looseObject({ service: Service });

export type Project = z.infer<typeof Project>;
export type Service = z.infer<typeof Service>;
export type Customer = z.infer<typeof Customer>;
