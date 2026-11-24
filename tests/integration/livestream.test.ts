import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as getLivestream, PATCH as patchLivestream } from "@/app/api/wedding/livestream/route";

import { createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** The YouTube livestream settings (PRD §9.24, API §70–72). */

type Handler = (request: NextRequest) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  error?: { code: string; message: string; details?: Record<string, string> };
}

const ID = "dQw4w9WgXcQ";
const WATCH = `https://www.youtube.com/watch?v=${ID}`;
const EMBED = `https://www.youtube-nocookie.com/embed/${ID}?rel=0&modestbranding=1`;

async function call(handler: Handler, { body, cookie }: { body?: unknown; cookie?: string } = {}) {
  const headers = new Headers({ origin: TEST_APP_URL });
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await handler(
    new NextRequest(`${TEST_APP_URL}/api/wedding/livestream`, {
      method: body === undefined ? "GET" : "PATCH",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

async function setup() {
  const owner = await createUser({ name: "Akshay Saini" });
  const wedding = await createWedding(owner._id);
  const member = await signedInUser({ wedding, role: "MANAGER" });
  return { cookie: member.cookie };
}

const patch = (cookie: string, body: unknown) => call(patchLivestream, { body, cookie });

describe("GET/PATCH /api/wedding/livestream", () => {
  it("starts with no link, switched off", async () => {
    const { cookie } = await setup();
    const result = await call(getLivestream, { cookie });
    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({ youtubeUrl: null, isEnabled: false, embedUrl: null });
  });

  it.each([
    `https://youtu.be/${ID}?si=share`,
    `https://www.youtube.com/live/${ID}?feature=shared`,
    `youtube.com/watch?v=${ID}&t=10s`,
  ])("stores %s as one canonical link with its player", async (link) => {
    const { cookie } = await setup();

    const result = await patch(cookie, { youtubeUrl: link });

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({ youtubeUrl: WATCH, isEnabled: false, embedUrl: EMBED });
  });

  it("switches it on and off once it has a link", async () => {
    const { cookie } = await setup();
    await patch(cookie, { youtubeUrl: WATCH });

    expect((await patch(cookie, { isEnabled: true })).body.data).toMatchObject({
      isEnabled: true,
      youtubeUrl: WATCH,
    });
    expect((await patch(cookie, { isEnabled: false })).body.data).toMatchObject({
      isEnabled: false,
      youtubeUrl: WATCH,
    });
  });

  it("won't switch on without a link", async () => {
    const { cookie } = await setup();

    const result = await patch(cookie, { isEnabled: true });

    expect(result.status).toBe(400);
    expect(result.body.error?.details).toEqual({ isEnabled: "Add the YouTube link first" });
  });

  it("removing the link also switches it off (API §72)", async () => {
    const { cookie } = await setup();
    await patch(cookie, { youtubeUrl: WATCH, isEnabled: true });

    const removed = await patch(cookie, { youtubeUrl: null, isEnabled: false });
    expect(removed.body.data).toEqual({ youtubeUrl: null, isEnabled: false, embedUrl: null });

    await patch(cookie, { youtubeUrl: WATCH, isEnabled: true });
    expect((await patch(cookie, { youtubeUrl: "" })).body.data).toEqual({
      youtubeUrl: null,
      isEnabled: false,
      embedUrl: null,
    });
  });

  it("refuses channel links, other sites, unknown fields and an empty change", async () => {
    const { cookie } = await setup();
    for (const body of [
      { youtubeUrl: "https://www.youtube.com/@akshayprinci/live" },
      { youtubeUrl: `https://vimeo.com/${ID}` },
      { youtubeUrl: "javascript:alert(1)" },
      { youtubeUrl: WATCH, embedUrl: "https://evil.example" },
      {},
    ]) {
      expect((await patch(cookie, body)).status).toBe(400);
    }
    const channel = await patch(cookie, {
      youtubeUrl: "https://www.youtube.com/@akshayprinci/live",
    });
    expect(channel.body.error?.details?.youtubeUrl).toMatch(/Channel links don't work/);
  });

  it("each wedding has its own livestream", async () => {
    const one = await setup();
    const two = await setup();
    await patch(one.cookie, { youtubeUrl: WATCH, isEnabled: true });
    expect((await call(getLivestream, { cookie: two.cookie })).body.data).toEqual({
      youtubeUrl: null,
      isEnabled: false,
      embedUrl: null,
    });
    expect((await call(getLivestream)).status).toBe(401);
  });
});
