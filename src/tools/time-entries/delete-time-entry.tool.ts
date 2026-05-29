import * as z from "zod/v4";

import type { ToolDefinition, ToolRun } from "../types.js";

const DeleteInput = z.object({
  id: z.number(),
  /** Off by default — delete is destructive, so it dry-runs unless set (ADR-0004). */
  confirm: z.boolean().optional(),
});
type DeleteInput = z.infer<typeof DeleteInput>;

export type DeleteTimeEntryResult =
  | { deleted: true; id: number }
  | { deleted: false; preview: { id: number } };

export const deleteTimeEntry: ToolRun<
  DeleteInput,
  DeleteTimeEntryResult
> = async (input, deps) => {
  if (!input.confirm) {
    return { deleted: false, preview: { id: input.id } };
  }

  // mite's DELETE returns an empty body; the entry is gone, so there is nothing
  // to echo beyond the id.
  await deps.getClient().delete(`/time_entries/${input.id}.json`);
  return { deleted: true, id: input.id };
};

export const deleteTimeEntryTool: ToolDefinition<DeleteInput> = {
  name: "delete_time_entry",
  title: "Delete time entry",
  description:
    "Permanently delete a mite time entry by id. Destructive, so it dry-runs " +
    "by default: without confirm:true it returns a preview of what would be " +
    "deleted and removes nothing. Pass confirm:true to delete. A locked entry " +
    "yields a clear locked-error message and is not deleted.",
  inputSchema: DeleteInput.shape,
  run: deleteTimeEntry,
};
