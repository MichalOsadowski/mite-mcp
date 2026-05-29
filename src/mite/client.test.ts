import { describe, expect, it, vi } from "vitest";
import * as z from "zod/v4";

import { MiteApiError, MiteClient } from "./client.js";

const respondWith = (status: number, body: string) =>
  vi.fn<typeof fetch>(async () => new Response(body, { status }));

describe("MiteClient.get", () => {
  it("authenticates with X-MiteApiKey, targets the account host, and returns parsed JSON", async () => {
    const fetchFn = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ user: { id: 1 } }), { status: 200 }),
    );
    const client = new MiteClient({
      account: "acme",
      apiKey: "secret-key",
      fetchFn,
    });

    const schema = z.looseObject({ user: z.looseObject({ id: z.number() }) });
    const result = await client.get("/myself.json", schema);

    expect(result).toEqual({ user: { id: 1 } });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://acme.mite.de/myself.json");
    expect((init?.headers as Record<string, string>)["X-MiteApiKey"]).toBe(
      "secret-key",
    );
  });
});

describe("MiteClient.fromEnv", () => {
  it("builds a client from MITE_ACCOUNT and MITE_API_KEY", async () => {
    const fetchFn = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const client = MiteClient.fromEnv(
      { MITE_ACCOUNT: "acme", MITE_API_KEY: "secret-key" },
      fetchFn,
    );

    await client.get("/myself.json", z.unknown());

    expect(fetchFn.mock.calls[0][0]).toBe("https://acme.mite.de/myself.json");
  });

  it.each(["MITE_ACCOUNT", "MITE_API_KEY"])(
    "throws a clear error when %s is missing",
    (missing) => {
      const env: Record<string, string> = {
        MITE_ACCOUNT: "acme",
        MITE_API_KEY: "secret-key",
      };
      delete env[missing];

      expect(() => MiteClient.fromEnv(env)).toThrow(
        /MITE_ACCOUNT.*MITE_API_KEY/,
      );
    },
  );
});

describe("MiteClient.get schema validation", () => {
  const SENTINEL = "RAW_UPSTREAM_SECRET_BODY";

  it("throws a non-leaky shape error when the response fails the schema", async () => {
    const client = new MiteClient({
      account: "acme",
      apiKey: "secret-key",
      fetchFn: respondWith(200, JSON.stringify({ user: { id: SENTINEL } })),
    });
    const schema = z.looseObject({ user: z.looseObject({ id: z.number() }) });

    const error = (await client
      .get("/myself.json", schema)
      .catch((e) => e)) as MiteApiError;

    expect(error).toBeInstanceOf(MiteApiError);
    expect(error.kind).toBe("shape");
    expect(error.message).not.toContain(SENTINEL);
  });
});

describe("MiteClient error mapping", () => {
  const SENTINEL = "RAW_UPSTREAM_SECRET_BODY";

  const clientFor = (status: number) =>
    new MiteClient({
      account: "acme",
      apiKey: "secret-key",
      fetchFn: respondWith(status, SENTINEL),
    });

  it("maps 401 to an auth error that names the env vars and leaks no raw body", async () => {
    const error = (await clientFor(401)
      .get("/myself.json", z.unknown())
      .catch((e) => e)) as MiteApiError;

    expect(error).toBeInstanceOf(MiteApiError);
    expect(error.kind).toBe("auth");
    expect(error.status).toBe(401);
    expect(error.message).toContain("MITE_ACCOUNT");
    expect(error.message).toContain("MITE_API_KEY");
    expect(error.message).not.toContain(SENTINEL);
  });

  it.each([
    [404, "not_found"],
    [422, "validation"],
    [423, "locked"],
    [500, "server"],
    [503, "server"],
  ])(
    "maps %i to kind %s without leaking the raw body",
    async (status, kind) => {
      const error = (await clientFor(status)
        .get("/myself.json", z.unknown())
        .catch((e) => e)) as MiteApiError;

      expect(error).toBeInstanceOf(MiteApiError);
      expect(error.kind).toBe(kind);
      expect(error.status).toBe(status);
      expect(error.message).not.toContain(SENTINEL);
    },
  );
});
