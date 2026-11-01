import { expect, test, vi } from "vitest";

// Next HTTP and unavailable service transport are boundary doubles only.
async function handler() {
  const modulePath = "../../src/pages/api/directory/[id]";
  const module = await import(modulePath).catch(() => ({}));
  expect(typeof module.default).toBe("function");
  return module.default;
}

function response() {
  const result = {
    status: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
  };
  const res = {
    setHeader(name: string, value: string) {
      result.headers[name.toLowerCase()] = value;
      return res;
    },
    status(value: number) {
      result.status = value;
      return res;
    },
    json(value: unknown) {
      result.body = value;
      return res;
    },
  };
  return { res, result };
}

test("the person adapter rejects write methods without contacting a backend", async () => {
  const endpoint = await handler();
  let calls = 0;
  vi.stubEnv("DIRECTORY_SERVICE_ORIGIN", "https://directory.example");
  vi.stubGlobal("fetch", async () => {
    calls++;
    return Response.json({});
  });
  try {
    for (const method of [
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "HEAD",
      "OPTIONS",
    ]) {
      const { res, result } = response();
      await endpoint({ method, query: { id: "ab".repeat(32) } }, res);
      expect(result.status).toBe(405);
      expect(result.headers.allow).toBe("GET");
    }
    expect(calls).toBe(0);
  } finally {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  }
});

test("the person GET adapter forwards a public key to the configured service only", async () => {
  const endpoint = await handler();
  const { res, result } = response();
  const pubkey = "ab".repeat(32);
  const data = {
    person: { pubkey },
    currentClaims: [],
    checks: [],
    legacy: [],
  };
  const calls: string[] = [];
  vi.stubEnv("DIRECTORY_SERVICE_ORIGIN", "https://directory.example");
  vi.stubGlobal("fetch", async (url: URL) => {
    calls.push(String(url));
    return Response.json(data);
  });
  try {
    await endpoint({ method: "GET", query: { id: pubkey } }, res);
    expect(result).toEqual({
      status: 200,
      body: data,
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
    expect(calls).toEqual([
      `https://directory.example/api/directory/${pubkey}`,
    ]);
  } finally {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  }
});
