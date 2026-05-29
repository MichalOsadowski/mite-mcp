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
