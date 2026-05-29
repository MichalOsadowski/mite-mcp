import { AccountResponse, Myself } from "../../mite/schemas.js";
import type { ToolDefinition, ToolRun } from "../types.js";

export interface WhoamiResult {
  user: { id: number; name: string; role: string };
  account: { name: string };
}

export const whoami: ToolRun<Record<string, unknown>, WhoamiResult> = async (
  _input,
  deps,
) => {
  const client = deps.getClient();
  const { user } = await client.get("/myself.json", Myself);
  const { account } = await client.get("/account.json", AccountResponse);

  return {
    user: { id: user.id, name: user.name, role: user.role },
    account: { name: account.name },
  };
};

export const whoamiTool: ToolDefinition = {
  name: "whoami",
  title: "Who am I",
  description:
    "Return the authenticated mite user (id, name, role) and account name.",
  inputSchema: {},
  run: whoami,
};
