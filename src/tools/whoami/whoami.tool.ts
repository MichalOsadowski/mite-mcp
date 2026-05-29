import type { MiteClient } from "../../mite/client.js";
import { AccountResponse, Myself } from "../../mite/schemas.js";
import type { ToolDefinition } from "../types.js";

export interface WhoamiResult {
  user: { id: number; name: string; role: string };
  account: { name: string };
}

export async function whoami(
  client: Pick<MiteClient, "get">,
): Promise<WhoamiResult> {
  const { user } = Myself.parse(await client.get("/myself.json"));
  const { account } = AccountResponse.parse(await client.get("/account.json"));

  return {
    user: { id: user.id, name: user.name, role: user.role },
    account: { name: account.name },
  };
}

export const whoamiTool: ToolDefinition = {
  name: "whoami",
  title: "Who am I",
  description:
    "Return the authenticated mite user (id, name, role) and account name.",
  inputSchema: {},
  run: (_input, deps) => whoami(deps.getClient()),
};
