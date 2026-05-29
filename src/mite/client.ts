export type MiteErrorKind =
  | "auth"
  | "not_found"
  | "validation"
  | "locked"
  | "server"
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

  async get<T>(path: string): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        "X-MiteApiKey": this.apiKey,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw mapError(response.status);
    }
    return (await response.json()) as T;
  }
}
