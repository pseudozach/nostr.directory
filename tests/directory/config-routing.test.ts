import { expect, test, vi } from "vitest";
import directory from "../../src/pages/api/directory/index";
import person from "../../src/pages/api/directory/[id]";

test.each([
  [directory, {}, "/api/directory"],
  [person, { id: "ab".repeat(32) }, `/api/directory/${"ab".repeat(32)}`],
])(
  "API uses fixed public backend without deployment secrets",
  async (handler, query, path) => {
    vi.stubEnv("DIRECTORY_SERVICE_ORIGIN", undefined);
    const requests: string[] = [];
    vi.stubGlobal("fetch", async (url: URL) => {
      requests.push(String(url));
      return Response.json({
        items: [],
        nextCursor: null,
        coverage: { complete: false },
        stale: false,
      });
    });
    let status = 0;
    const response = {
      setHeader() {
        return response;
      },
      status(value: number) {
        status = value;
        return response;
      },
      json() {
        return response;
      },
    };
    try {
      await handler({ method: "GET", query } as never, response as never);
      expect(status).toBe(200);
      expect(requests).toEqual([`https://api.nostr.directory${path}`]);
    } finally {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }
  }
);
