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
