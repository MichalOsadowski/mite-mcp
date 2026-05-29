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
 * Lookup resources. mite's list endpoints return an array of single-key-wrapped
 * objects — e.g. `[{ "project": { … } }, …]` — so each resource has an inner
 * schema (validate only the fields we consume) and a response schema for the
 * wrapped array, which is what we hand to `client.get`.
 */

export const Project = z.looseObject({
  id: z.number(),
  name: z.string(),
  customer_id: z.number().nullable(),
  customer_name: z.string().nullable(),
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

export type Project = z.infer<typeof Project>;
export type Service = z.infer<typeof Service>;
export type Customer = z.infer<typeof Customer>;
