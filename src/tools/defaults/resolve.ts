import { ProjectResponse, ServiceResponse } from "../../mite/schemas.js";
import type { ToolDeps } from "../types.js";

/**
 * The shared mechanism for the `defaults/` module: resolving project/service
 * ids to their names through the client seam, and the structured "no default" /
 * "no scope" responses reused by create (#9). These are plain return values —
 * never throws — so they flow back through register.ts as normal data, not as
 * the generic error dump the brief forbids.
 */

export interface NamedRef {
  id: number;
  name: string;
}

/** Resolve a project id to its name via the client (validated, non-leaky). */
export const resolveProjectName = async (
  deps: ToolDeps,
  id: number,
): Promise<NamedRef> => {
  const { project } = await deps
    .getClient()
    .get(`/projects/${id}.json`, ProjectResponse);
  return { id: project.id, name: project.name };
};

/** Resolve a service id to its name via the client (validated, non-leaky). */
export const resolveServiceName = async (
  deps: ToolDeps,
  id: number,
): Promise<NamedRef> => {
  const { service } = await deps
    .getClient()
    .get(`/services/${id}.json`, ServiceResponse);
  return { id: service.id, name: service.name };
};

export interface NoScopeResponse {
  ok: false;
  reason: "no_scope";
  message: string;
  existing_scopes: string[];
}

/**
 * A structured, actionable response when no scope key could be resolved from
 * the environment. Lists the scopes that DO exist so the caller can pick one or
 * set a new one — not an error dump.
 */
export const noScopeResponse = async (
  deps: ToolDeps,
): Promise<NoScopeResponse> => ({
  ok: false,
  reason: "no_scope",
  message:
    "No scope could be resolved from the environment. Set MITE_DEFAULT_SCOPE " +
    "in your .mcp.json, run inside a git repository, or pass an explicit scope.",
  existing_scopes: Object.keys(await deps.getDefaults().list()),
});

export interface NoDefaultResponse {
  ok: false;
  reason: "no_default";
  message: string;
  existing_scopes: string[];
}

/**
 * The structured, actionable response when create is missing ids and no default
 * exists for the resolved scope (or no scope resolved at all). It names the
 * scopes that DO exist and points at set_default — not an error dump. Returned
 * as data so it surfaces through register.ts like a normal result.
 */
export const noDefaultResponse = async (
  deps: ToolDeps,
): Promise<NoDefaultResponse> => ({
  ok: false,
  reason: "no_default",
  message:
    "No default project/service is set for this scope, and project_id/" +
    "service_id were not provided. Set one with set_default, or pass the ids " +
    "explicitly.",
  existing_scopes: Object.keys(await deps.getDefaults().list()),
});
