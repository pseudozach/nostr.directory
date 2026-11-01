import { bech32 } from "bech32";
import { nip19 } from "nostr-tools";
import { expect, test, vi } from "vitest";
import * as proxy from "../../src/directory/proxy";

test("a stalled service settles unavailable at the deadline even when transport ignores abort", async () => {
  vi.useFakeTimers();
  try {
    let signal: AbortSignal | undefined;
    let settled = false;
    const transport = (
      _url: unknown,
      options?: RequestInit
    ): Promise<Response> => {
      signal = options?.signal ?? undefined;
      return new Promise(() => {});
    };
    const pending = proxy.readDirectory(
      "https://directory.example",
      {},
      transport
    );
    void pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(3001);
    expect(settled).toBe(true);
    expect(await pending).toEqual({
      status: 502,
      body: { error: "directory unavailable", stale: true },
    });
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

test("oversized service bodies fail closed instead of forwarding unbounded JSON", async () => {
  const transport = async () =>
    new Response(JSON.stringify({ text: "x".repeat(1024 * 1024) }), {
      headers: { "content-type": "application/json" },
    });
  expect(
    await proxy.readDirectory("https://directory.example", {}, transport)
  ).toEqual({
    status: 502,
    body: { error: "directory unavailable", stale: true },
  });
});

test("JSON-looking but invalid MIME types fail closed", async () => {
  for (const type of ["text/application/json", "evilapplication/json"]) {
    const transport = async () =>
      new Response("{}", { headers: { "content-type": type } });
    expect(
      await proxy.readDirectory("https://directory.example", {}, transport)
    ).toEqual({
      status: 502,
      body: { error: "directory unavailable", stale: true },
    });
  }
});

test("person reads use only a canonical public key at the fixed service path", async () => {
  expect(typeof proxy.readPerson).toBe("function");
  const calls: string[] = [];
  const pubkey = "ab".repeat(32);
  const data = {
    person: { pubkey },
    currentClaims: [],
    checks: [],
    legacy: [],
  };
  const transport = async (url: string | URL | Request) => {
    calls.push(String(url));
    return Response.json(data);
  };
  expect(
    await proxy.readPerson("https://directory.example", pubkey, transport)
  ).toEqual({ status: 200, body: data });
  expect(calls).toEqual([`https://directory.example/api/directory/${pubkey}`]);
});

test("public NIP19 identifiers resolve to the same fixed person key without using relay hints", async () => {
  const pubkey = "ab".repeat(32);
  const calls: string[] = [];
  const transport = async (url: string | URL | Request) => {
    calls.push(String(url));
    return Response.json({ person: { pubkey } });
  };
  for (const id of [
    nip19.npubEncode(pubkey),
    nip19.nprofileEncode({
      pubkey,
      relays: ["wss://attacker.example", "ws://127.0.0.1"],
    }),
  ]) {
    expect(
      (await proxy.readPerson("https://directory.example", id, transport))
        .status
    ).toBe(200);
  }
  expect(calls).toEqual(
    Array(2).fill(`https://directory.example/api/directory/${pubkey}`)
  );
});

test("nprofile identifiers without relay hints remain valid public keys", async () => {
  const pubkey = "ab".repeat(32);
  const transport = async (url: string | URL | Request) => {
    expect(String(url)).toBe(
      `https://directory.example/api/directory/${pubkey}`
    );
    return Response.json({ person: { pubkey } });
  };
  const result = await proxy.readPerson(
    "https://directory.example",
    nip19.nprofileEncode({ pubkey }),
    transport
  );
  expect(result.status).toBe(200);
});

// Additional boundary qualification of the implemented decoder, not new behavior.
test("invalid, secret and ambiguous identifiers never contact the service", async () => {
  let calls = 0;
  const transport = async () => {
    calls++;
    return Response.json({});
  };
  const key = Array(32).fill(171);
  const profile = (bytes: number[]) =>
    bech32.encode("nprofile", bech32.toWords(bytes), 1024);
  for (const id of [
    undefined,
    [],
    ["ab".repeat(32)],
    "",
    "../admin",
    "https://attacker.example",
    "nsec1private",
    nip19.nsecEncode("ab".repeat(32)),
    nip19.noteEncode("ab".repeat(32)),
    "ab".repeat(31),
    "npub1badchecksum",
    "npub1" + "q".repeat(1024),
    profile([0]),
    profile([0, 32, 1]),
    profile([0, 31, ...key.slice(1)]),
    profile([0, 32, ...key, 0, 32, ...key]),
    profile([1, 0]),
    bech32.encode("npub", bech32.toWords([1]), 1024),
  ]) {
    expect(
      await proxy.readPerson("https://directory.example", id, transport)
    ).toEqual({
      status: 400,
      body: { error: "invalid public identifier" },
    });
  }
  expect(calls).toBe(0);
});

test("person failures remain unavailable rather than empty identity lists", async () => {
  const key = "ab".repeat(32);
  const transport = async () => {
    throw new Error("private upstream detail");
  };
  expect(await proxy.readPerson(undefined, key, transport)).toEqual({
    status: 503,
    body: { error: "directory unavailable", stale: true },
  });
  expect(
    await proxy.readPerson("https://directory.example", key, transport)
  ).toEqual({
    status: 502,
    body: { error: "directory unavailable", stale: true },
  });
});

// Fetch is doubled only at the unavailable service transport boundary.
test("an unconfigured backend returns unavailable rather than a fabricated empty directory", async () => {
  let calls = 0;
  const transport = async () => {
    calls++;
    return new Response("{}");
  };
  expect(typeof proxy.readDirectory).toBe("function");
  expect(await proxy.readDirectory(undefined, {}, transport)).toEqual({
    status: 503,
    body: { error: "directory unavailable", stale: true },
  });
  expect(calls).toBe(0);
});

test("search uses only the configured service endpoint with encoded query and no browser credentials", async () => {
  let seen: { url: string; options?: RequestInit } | undefined;
  const data = {
    items: [],
    nextCursor: null,
    coverage: { complete: false },
    asOf: null,
    stale: true,
  };
  const transport = async (
    url: string | URL | Request,
    options?: RequestInit
  ) => {
    seen = { url: String(url), options };
    return Response.json(data);
  };
  expect(
    await proxy.readDirectory(
      "https://directory.example",
      { q: "alice & bob", platform: "github" },
      transport
    )
  ).toEqual({ status: 200, body: data });
  expect(seen?.url).toBe(
    "https://directory.example/api/directory?q=alice+%26+bob&platform=github"
  );
  expect(seen?.options).toMatchObject({
    redirect: "error",
    credentials: "omit",
    cache: "no-store",
  });
  expect(seen?.options?.signal).toBeInstanceOf(AbortSignal);
});

test("untrusted query keys, duplicates, secrets and oversized search values never reach the service", async () => {
  let calls = 0;
  const transport = async () => {
    calls++;
    return Response.json({});
  };
  for (const query of [
    { url: "https://attacker.example" },
    { q: ["one", "two"] },
    { q: "nsec1private" },
    { q: "x".repeat(121) },
    { q: "line\nfeed" },
    { platform: "../admin" },
    { state: "made-up" },
    { cursor: "../internal" },
    { cursor: "x".repeat(257) },
  ]) {
    expect(
      await proxy.readDirectory("https://directory.example", query, transport)
    ).toEqual({ status: 400, body: { error: "invalid directory query" } });
  }
  expect(calls).toBe(0);
});

test("invalid service origins fail closed without making a request", async () => {
  let calls = 0;
  const transport = async () => {
    calls++;
    return Response.json({});
  };
  for (const origin of [
    "file:///tmp/service",
    "https://user:password@service.example",
    "https://service.example/private",
    "https://service.example?url=other",
    "not a url",
    "http://public.example",
  ]) {
    expect(await proxy.readDirectory(origin, {}, transport)).toEqual({
      status: 503,
      body: { error: "directory unavailable", stale: true },
    });
  }
  expect(calls).toBe(0);
});

test("service errors, redirects and malformed payloads expose no upstream detail or fake success", async () => {
  for (const transport of [
    async () => {
      throw new Error("private upstream detail");
    },
    async () => new Response("private upstream detail", { status: 500 }),
    async () =>
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/private" },
      }),
    async () =>
      new Response("not json", {
        headers: { "content-type": "application/json" },
      }),
    async () =>
      new Response("<html>private</html>", {
        headers: { "content-type": "text/html" },
      }),
  ]) {
    expect(
      await proxy.readDirectory("https://directory.example", {}, transport)
    ).toEqual({
      status: 502,
      body: { error: "directory unavailable", stale: true },
    });
  }
});
