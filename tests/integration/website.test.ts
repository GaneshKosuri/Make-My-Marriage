import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as publicWebsite } from "@/app/api/public/weddings/[slug]/route";
import { GET as getWebsite, PATCH as patchWebsite } from "@/app/api/wedding/website/route";
import { EventModel } from "@/modules/events/event.model";
import { WeddingModel } from "@/modules/weddings/wedding.model";

import { createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** The wedding website settings and the public website (PRD §9.18–9.19, API §67–69). */

type Handler = (request: NextRequest, context?: { params: Promise<unknown> }) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  error?: { code: string; message: string; details?: Record<string, string> };
}

async function call(
  handler: Handler,
  {
    method = "GET",
    params = {},
    body,
    cookie,
  }: { method?: string; params?: Record<string, string>; body?: unknown; cookie?: string } = {},
) {
  const headers = new Headers({ origin: TEST_APP_URL, "x-forwarded-for": "203.0.113.10" });
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await handler(
    new NextRequest(`${TEST_APP_URL}/api/wedding/website`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

async function setup() {
  const owner = await createUser({ name: "Akshay Saini" });
  const wedding = await createWedding(owner._id);
  await WeddingModel.updateOne(
    { _id: wedding._id },
    { $set: { "location.city": "Dehradun", "location.state": "Uttarakhand" } },
  );
  const member = await signedInUser({ wedding, role: "MANAGER" });
  return { wedding, slug: wedding.website.slug, cookie: member.cookie };
}

const publish = (cookie: string, extra: Record<string, unknown> = {}) =>
  call(patchWebsite, { method: "PATCH", body: { isPublished: true, ...extra }, cookie });

describe("GET/PATCH /api/wedding/website", () => {
  it("starts unpublished in the Classic theme, with the address from the app URL", async () => {
    const { cookie, slug } = await setup();

    const result = await call(getWebsite, { cookie });

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({
      slug,
      theme: "CLASSIC",
      isPublished: false,
      welcomeMessage: null,
      showGallery: false,
      url: `${TEST_APP_URL}/w/${slug}`,
    });
  });

  it("changes the theme, welcome message, publish flag and gallery button", async () => {
    const { cookie, slug } = await setup();

    const result = await call(patchWebsite, {
      method: "PATCH",
      body: {
        theme: "MODERN",
        welcomeMessage: "  We would love to celebrate with you.  ",
        isPublished: true,
        showGallery: true,
      },
      cookie,
    });

    expect(result.body.data).toEqual({
      slug,
      theme: "MODERN",
      isPublished: true,
      welcomeMessage: "We would love to celebrate with you.",
      showGallery: true,
      url: `${TEST_APP_URL}/w/${slug}`,
    });
    const cleared = await call(patchWebsite, {
      method: "PATCH",
      body: { welcomeMessage: "   " },
      cookie,
    });
    expect(cleared.body.data).toMatchObject({ welcomeMessage: null, theme: "MODERN" });
  });

  it("refuses an empty change, an unknown theme, a long message, the slug and a weddingId", async () => {
    const { cookie, wedding } = await setup();
    for (const body of [
      {},
      { theme: "GOTHIC" },
      { welcomeMessage: "x".repeat(1001) },
      { slug: "new-address" },
      { isPublished: true, weddingId: wedding._id.toString() },
    ]) {
      expect((await call(patchWebsite, { method: "PATCH", body, cookie })).status).toBe(400);
    }
  });

  it("needs a signed-in member", async () => {
    expect((await call(getWebsite)).status).toBe(401);
  });
});

describe("GET /api/public/weddings/:slug", () => {
  it("answers 404 until the website is published, and for unknown or deleted weddings", async () => {
    const { cookie, slug, wedding } = await setup();
    expect((await call(publicWebsite, { params: { slug } })).status).toBe(404);
    expect(
      (await call(publicWebsite, { params: { slug: "no-such-wedding-01012030" } })).status,
    ).toBe(404);
    expect((await call(publicWebsite, { params: { slug: "Not A Slug!" } })).status).toBe(404);

    await publish(cookie);
    expect((await call(publicWebsite, { params: { slug } })).status).toBe(200);

    await WeddingModel.updateOne({ _id: wedding._id }, { $set: { deletedAt: new Date() } });
    expect((await call(publicWebsite, { params: { slug } })).status).toBe(404);
  });

  it("shows the couple, place, welcome and every active event in order with Maps links", async () => {
    const { cookie, slug, wedding } = await setup();
    await EventModel.create([
      {
        weddingId: wedding._id,
        name: "Wedding",
        startsAt: new Date("2027-02-14T12:00:00Z"),
        venueName: "Royal Garden",
        address: "Rajpur Road, Dehradun",
        dressCode: "Traditional",
      },
      { weddingId: wedding._id, name: "Mehendi", startsAt: new Date("2027-02-12T10:30:00Z") },
      {
        weddingId: wedding._id,
        name: "Roka",
        startsAt: new Date("2027-01-01T12:00:00Z"),
        archivedAt: new Date(),
      },
    ]);
    await publish(cookie, { theme: "MINIMAL", welcomeMessage: "Welcome!" });

    const result = await call(publicWebsite, { params: { slug } });

    expect(result.body.data).toEqual({
      brideName: "Princi",
      groomName: "Akshay",
      title: "Akshay & Princi",
      description: null,
      welcomeMessage: "Welcome!",
      weddingDate: "2027-02-14",
      timeZone: "Asia/Kolkata",
      place: "Dehradun, Uttarakhand",
      coverImageUrl: null,
      theme: "MINIMAL",
      events: [
        {
          name: "Mehendi",
          startsAt: "2027-02-12T10:30:00.000Z",
          endsAt: null,
          venueName: null,
          address: null,
          dressCode: null,
          mapUrl: null,
        },
        {
          name: "Wedding",
          startsAt: "2027-02-14T12:00:00.000Z",
          endsAt: null,
          venueName: "Royal Garden",
          address: "Rajpur Road, Dehradun",
          dressCode: "Traditional",
          mapUrl:
            "https://www.google.com/maps/search/?api=1&query=Royal%20Garden%2C%20Rajpur%20Road%2C%20Dehradun",
        },
      ],
      gallery: { enabled: false, url: null },
      livestream: { enabled: false, youtubeUrl: null, embedUrl: null },
    });
  });

  it("shows the gallery button only while the gallery is on and the family shows it", async () => {
    const { cookie, slug, wedding } = await setup();
    await publish(cookie, { showGallery: true });
    const gallery = async () =>
      ((await call(publicWebsite, { params: { slug } })).body.data as { gallery: unknown }).gallery;

    expect(await gallery()).toEqual({ enabled: false, url: null });
    await WeddingModel.updateOne({ _id: wedding._id }, { $set: { "gallery.isEnabled": true } });
    expect(await gallery()).toEqual({
      enabled: true,
      url: `${TEST_APP_URL}/gallery/${wedding.gallery.token}`,
    });
    await call(patchWebsite, { method: "PATCH", body: { showGallery: false }, cookie });
    expect(await gallery()).toEqual({ enabled: false, url: null });
  });

  it("shows the livestream only when it is switched on and has a link", async () => {
    const { cookie, slug, wedding } = await setup();
    await publish(cookie);
    const livestream = async () =>
      ((await call(publicWebsite, { params: { slug } })).body.data as { livestream: unknown })
        .livestream;

    await WeddingModel.updateOne({ _id: wedding._id }, { $set: { "livestream.isEnabled": true } });
    expect(await livestream()).toEqual({ enabled: false, youtubeUrl: null, embedUrl: null });
    await WeddingModel.updateOne(
      { _id: wedding._id },
      { $set: { "livestream.youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } },
    );
    expect(await livestream()).toEqual({
      enabled: true,
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1",
    });
  });

  it("each wedding's settings change only its own website", async () => {
    const one = await setup();
    const two = await setup();
    await publish(one.cookie, { theme: "MODERN" });

    expect((await call(publicWebsite, { params: { slug: two.slug } })).status).toBe(404);
    expect((await call(getWebsite, { cookie: two.cookie })).body.data).toMatchObject({
      slug: two.slug,
      theme: "CLASSIC",
      isPublished: false,
    });
  });
});
