import type { ZodType, infer as zInfer } from "zod/v4";

export type MiteErrorKind =
  | "auth"
  | "not_found"
  | "validation"
  | "locked"
  | "server"
  | "shape"
  | "unknown";

export class MiteApiError extends Error {
  constructor(
    readonly status: number,
    readonly kind: MiteErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "MiteApiError";
  }
}

const mapError = (status: number): MiteApiError => {
  switch (status) {
    case 401:
      return new MiteApiError(
        status,
        "auth",
        "mite authentication failed. Check MITE_ACCOUNT and MITE_API_KEY.",
      );
    case 404:
      return new MiteApiError(status, "not_found", "mite resource not found.");
    case 422:
      return new MiteApiError(
        status,
        "validation",
        "mite rejected the request as invalid.",
      );
    case 423:
      return new MiteApiError(
        status,
        "locked",
        "mite entry is locked and cannot be changed.",
      );
  }
  if (status >= 500) {
    return new MiteApiError(
      status,
      "server",
      "mite is currently unavailable. Try again later.",
    );
  }
  return new MiteApiError(
    status,
    "unknown",
    `mite request failed (${status}).`,
  );
};

export interface MiteClientOptions {
  account: string;
  apiKey: string;
  fetchFn?: typeof fetch;
}

export class MiteClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: MiteClientOptions) {
    this.baseUrl = `https://${options.account}.mite.de`;
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  static fromEnv(
    env: Record<string, string | undefined> = process.env,
    fetchFn?: typeof fetch,
  ): MiteClient {
    const account = env.MITE_ACCOUNT;
    const apiKey = env.MITE_API_KEY;
    if (!account || !apiKey) {
      throw new Error(
        "Missing mite credentials: set MITE_ACCOUNT and MITE_API_KEY in the environment.",
      );
    }
    return new MiteClient({ account, apiKey, fetchFn });
  }

  async get<S extends ZodType>(path: string, schema: S): Promise<zInfer<S>> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        "X-MiteApiKey": this.apiKey,
        Accept: "application/json",
      },
    });
    return this.validate(response, schema);
  }

  /**
   * The write seam: POST a JSON body and validate the response through the same
   * zod-schema seam as `get`. Non-OK statuses map through `mapError`; a shape
   * mismatch becomes a non-leaky `MiteApiError` of kind `shape`. Write tools
   * reach this via `ToolDeps.getClient()`.
   */
  async post<S extends ZodType>(
    path: string,
    body: unknown,
    schema: S,
  ): Promise<zInfer<S>> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "X-MiteApiKey": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    return this.validate(response, schema);
  }

  /**
   * Partial update of a resource. mite replies `200` with an EMPTY body, so
   * there is nothing to validate beyond the status — unlike `get`/`post`, this
   * verb does not run a zod schema (an empty body would fail `response.json()`).
   * Non-OK statuses map through `mapError`; a locked entry surfaces as kind
   * `locked` (423). Reached by write tools via `ToolDeps.getClient()`.
   */
  async patch(path: string, body: unknown): Promise<void> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: "PATCH",
      headers: {
        "X-MiteApiKey": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw mapError(response.status);
    }
  }

  /**
   * Delete a resource. Like `patch`, mite replies `200` with an EMPTY body, so
   * only the status is checked (no schema). Non-OK statuses map through
   * `mapError`; a locked entry surfaces as kind `locked` (423).
   */
  async delete(path: string): Promise<void> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: {
        "X-MiteApiKey": this.apiKey,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw mapError(response.status);
    }
  }

  private async validate<S extends ZodType>(
    response: Response,
    schema: S,
  ): Promise<zInfer<S>> {
    if (!response.ok) {
      throw mapError(response.status);
    }
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      throw new MiteApiError(
        response.status,
        "shape",
        "mite returned an unexpected response shape.",
      );
    }
    return parsed.data;
  }
}
