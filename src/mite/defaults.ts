import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

import * as z from "zod/v4";

/**
 * The per-scope defaults store and its scope resolution (ADR-0005). A pure,
 * filesystem-facing mechanism: every impure input (config dir, env, git) is
 * injected at construction so it is unit-testable without touching the real
 * home directory or running real git. We store ONLY project + service per scope
 * — the customer is derivable from the project.
 */

/** What a scope binds to: a default project + service. */
export interface Default {
  project_id: number;
  service_id: number;
}

const Default = z.object({
  project_id: z.number(),
  service_id: z.number(),
});

const DefaultsFile = z.object({
  scopes: z.record(z.string(), Default),
});

type DefaultsFile = z.infer<typeof DefaultsFile>;

/**
 * Normalize a git remote URL to a stable key. https and ssh forms of the same
 * repo must collapse to one key, or a default set under one form silently
 * orphans under the other (the exact failure ADR-0005 exists to prevent). We
 * strip the protocol/credentials, lowercase the host, and drop the trailing
 * `.git` and any trailing slashes.
 */
export const normalizeGitRemote = (remote: string): string => {
  let s = remote.trim();
  // scp-like ssh form: git@host:path  ->  host/path
  const scp = /^[^/]+@([^:]+):(.+)$/.exec(s);
  if (scp) {
    s = `${scp[1]}/${scp[2]}`;
  } else {
    // protocol form: strip scheme and any user@ credentials
    s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/^[^/@]+@/, "");
  }
  s = s.replace(/\.git$/i, "").replace(/\/+$/, "");
  // Lowercase host and path: hosts are case-insensitive, and forge paths are
  // case-insensitive in practice (GitHub treats Acme/Web == acme/web).
  return s.toLowerCase();
};

export interface DefaultsStoreConfig {
  /** Config base dir; the file lives at `<baseDir>/mite-mcp/defaults.json`. */
  baseDir: string;
  env: Record<string, string | undefined>;
  /** Returns the repo's git remote URL, or null when there is none. */
  readGitRemote: () => string | null;
  /** Returns the repo root path, or null when not in a git repo. */
  readGitRoot: () => string | null;
}

export interface DefaultsStore {
  /** Resolve the scope key by the priority chain, or null if none applies. */
  resolveKey(scopeArg?: string): string | null;
  /** The stored default for the resolved scope, or null. */
  get(scopeArg?: string): Promise<Default | null>;
  /** Persist a default for the resolved scope (atomic write). */
  set(scopeArg: string | undefined, value: Default): Promise<void>;
  /** Remove the default for the resolved scope. */
  clear(scopeArg?: string): Promise<void>;
  /** Every stored scope, keyed by key. */
  list(): Promise<Record<string, Default>>;
}

export class NoScopeError extends Error {
  constructor() {
    super(
      "No scope could be resolved from the environment. Set MITE_DEFAULT_SCOPE " +
        "in your .mcp.json, or run inside a git repository, or pass an explicit scope.",
    );
    this.name = "NoScopeError";
  }
}

export const createDefaultsStore = (
  config: DefaultsStoreConfig,
): DefaultsStore => {
  const dir = join(config.baseDir, "mite-mcp");
  const filePath = join(dir, "defaults.json");

  const resolveKey = (scopeArg?: string): string | null => {
    // Priority chain (ADR-0005). The key is NEVER authored by the LLM in the
    // dominant flow — `scopeArg` is the not-built-now global-mode bridge.
    if (scopeArg !== undefined && scopeArg.trim() !== "") {
      return scopeArg;
    }
    const envScope = config.env.MITE_DEFAULT_SCOPE;
    if (envScope !== undefined && envScope.trim() !== "") {
      return envScope;
    }
    const remote = config.readGitRemote();
    if (remote) {
      return normalizeGitRemote(remote);
    }
    const root = config.readGitRoot();
    if (root) {
      return root;
    }
    return null;
  };

  const read = (): DefaultsFile => {
    let raw: string;
    try {
      raw = readFileSync(filePath, "utf8");
    } catch {
      return { scopes: {} };
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return { scopes: {} };
    }
    const parsed = DefaultsFile.safeParse(json);
    return parsed.success ? parsed.data : { scopes: {} };
  };

  /** Atomic persist: write a unique temp file, then rename over the target. */
  const write = (data: DefaultsFile): void => {
    mkdirSync(dir, { recursive: true });
    const tmp = join(dir, `.defaults.${process.pid}.${Date.now()}.tmp`);
    writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    renameSync(tmp, filePath);
  };

  return {
    resolveKey,

    get(scopeArg?: string): Promise<Default | null> {
      const key = resolveKey(scopeArg);
      if (key === null) {
        return Promise.resolve(null);
      }
      return Promise.resolve(read().scopes[key] ?? null);
    },

    set(scopeArg: string | undefined, value: Default): Promise<void> {
      const key = resolveKey(scopeArg);
      if (key === null) {
        return Promise.reject(new NoScopeError());
      }
      const data = read();
      data.scopes[key] = value;
      write(data);
      return Promise.resolve();
    },

    clear(scopeArg?: string): Promise<void> {
      const key = resolveKey(scopeArg);
      if (key === null) {
        return Promise.resolve();
      }
      const data = read();
      delete data.scopes[key];
      write(data);
      return Promise.resolve();
    },

    list(): Promise<Record<string, Default>> {
      return Promise.resolve(read().scopes);
    },
  };
};

/** Read a value from git in `cwd`, returning null on any failure. */
const gitRead = (args: string[], cwd: string): string | null => {
  try {
    const out = execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const trimmed = out.trim();
    return trimmed === "" ? null : trimmed;
  } catch {
    return null;
  }
};

/**
 * The production store: config dir under `~/.config`, env from the process, and
 * git inputs read from the process working directory. Tests use
 * `createDefaultsStore` directly with injected inputs instead.
 */
export const createDefaultsStoreFromEnv = (
  env: Record<string, string | undefined> = process.env,
  cwd: string = process.cwd(),
): DefaultsStore => {
  const baseDir =
    env.XDG_CONFIG_HOME && env.XDG_CONFIG_HOME.trim() !== ""
      ? env.XDG_CONFIG_HOME
      : join(homedir(), ".config");
  return createDefaultsStore({
    baseDir,
    env,
    readGitRemote: () => gitRead(["remote", "get-url", "origin"], cwd),
    readGitRoot: () => gitRead(["rev-parse", "--show-toplevel"], cwd),
  });
};
