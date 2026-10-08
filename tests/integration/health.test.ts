import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("reports ok with the database up", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/api/health"), {
      params: Promise.resolve({}),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { status: "ok", db: "up" } });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
