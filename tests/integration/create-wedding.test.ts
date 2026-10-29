import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as me } from "@/app/api/auth/me/route";
import { POST as createWedding } from "@/app/api/wedding/route";
import { MembershipModel } from "@/modules/members/membership.model";
import { WeddingModel } from "@/modules/weddings/wedding.model";

import { createWedding as weddingFixture, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** POST /api/wedding (API_DESIGN §17, DATABASE_DESIGN §85, PRD §9.2). */

type Handler = (request: NextRequest) => Promise<Response>;
interface ApiBody {
  data?: Record<string, unknown>;
  error?: { code: string; details?: Record<string, string> };
}

async function call(handler: Handler, { body, cookie }: { body?: unknown; cookie?: string }) {
  const headers = new Headers({ origin: TEST_APP_URL });
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await handler(
    new NextRequest(`${TEST_APP_URL}/api/wedding`, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

const input = (overrides: Record<string, unknown> = {}) => ({
  brideName: "Juliet",
  groomName: "Romeo",
  title: "Romeo & Juliet",
  description: "We're getting married!",
  weddingDate: "2099-02-14",
  location: { city: "Dehradun", state: "Uttarakhand", country: "India" },
  ...overrides,
});

const slugOf = (result: { body: ApiBody }) =>
  (result.body.data?.website as { slug: string } | undefined)?.slug;

describe("POST /api/wedding", () => {
  it("creates the wedding with its creator as the first Admin", async () => {
    const { user, cookie } = await signedInUser();
    const result = await call(createWedding, { cookie, body: input() });

    expect(result.status).toBe(201);
    expect(result.body.data).toEqual({
      id: expect.any(String),
      brideName: "Juliet",
      groomName: "Romeo",
      weddingDate: "2099-02-14",
      website: { slug: expect.stringMatching(/^romeo-juliet-14022099(-\d+)?$/) },
    });

    const weddingId = result.body.data!.id as string;
    const wedding = await WeddingModel.findById(weddingId).select("+gallery.token").lean().orFail();
    expect(wedding).toMatchObject({
      title: "Romeo & Juliet",
      description: "We're getting married!",
      timeZone: "Asia/Kolkata",
      location: {
        city: "Dehradun",
        state: "Uttarakhand",
        country: "India",
        formattedAddress: "Dehradun, Uttarakhand, India",
      },
      website: { theme: "CLASSIC", isPublished: false },
      gallery: { isEnabled: false, guestUploadsEnabled: false },
      createdByUserId: user._id,
      deletedAt: null,
    });
    expect(wedding.gallery.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(result.body)).not.toContain(wedding.gallery.token);

    const membership = await MembershipModel.findOne({ userId: user._id })
      .setOptions({ tenantScoped: false })
      .lean()
      .orFail();
    expect(membership).toMatchObject({ weddingId: wedding._id, role: "ADMIN" });

    // The same session now resolves to a member of this wedding.
    expect((await call(me, { cookie })).body.data).toMatchObject({
      membership: { role: "ADMIN" },
      wedding: { id: weddingId, brideName: "Juliet", groomName: "Romeo" },
    });
  });

  it("stores blank optional fields as null", async () => {
    const { cookie } = await signedInUser();
    const result = await call(createWedding, {
      cookie,
      body: input({ title: "", description: "  ", location: { city: "Goa" } }),
    });
    const wedding = await WeddingModel.findById(result.body.data!.id).lean().orFail();
    expect(wedding).toMatchObject({
      title: null,
      description: null,
      location: { city: "Goa", state: null, country: null, formattedAddress: "Goa" },
    });
  });

  it("gives the next couple with the same names and date the next free address", async () => {
    const first = await call(createWedding, {
      cookie: (await signedInUser()).cookie,
      body: input({ weddingDate: "2098-03-01" }),
    });
    const second = await call(createWedding, {
      cookie: (await signedInUser()).cookie,
      body: input({ weddingDate: "2098-03-01" }),
    });
    expect(slugOf(first)).toBe("romeo-juliet-01032098");
    expect(slugOf(second)).toBe("romeo-juliet-01032098-2");
  });

  it("allows only one wedding per user (PRD Rule 1)", async () => {
    const { cookie } = await signedInUser();
    expect((await call(createWedding, { cookie, body: input() })).status).toBe(201);
    const again = await call(createWedding, { cookie, body: input() });
    expect(again).toMatchObject({ status: 409, body: { error: { code: "ALREADY_HAS_WEDDING" } } });
  });

  it("rejects a member of another wedding too", async () => {
    const founder = await signedInUser();
    const existing = await weddingFixture(founder.user._id);
    const { cookie } = await signedInUser({ wedding: existing, role: "MANAGER" });
    const result = await call(createWedding, { cookie, body: input() });
    expect(result.body.error?.code).toBe("ALREADY_HAS_WEDDING");
  });

  it("creates exactly one wedding when the same user submits twice at once", async () => {
    const { user, cookie } = await signedInUser();
    const results = await Promise.all([
      call(createWedding, { cookie, body: input({ weddingDate: "2097-05-05" }) }),
      call(createWedding, { cookie, body: input({ weddingDate: "2097-05-05" }) }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await WeddingModel.countDocuments({ createdByUserId: user._id })).toBe(1);
  });

  it("validates input and rejects a client-supplied weddingId", async () => {
    const { cookie } = await signedInUser();
    const invalid = await call(createWedding, {
      cookie,
      body: { brideName: "", groomName: "", weddingDate: "2001-01-01", location: { city: "" } },
    });
    expect(invalid).toMatchObject({
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          details: {
            brideName: "Enter the bride's name",
            groomName: "Enter the groom's name",
            weddingDate: "Choose today or a later date",
            "location.city": "Enter the city",
          },
        },
      },
    });
    const smuggled = await call(createWedding, { cookie, body: input({ weddingId: "x" }) });
    expect(smuggled.body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("requires a signed-in user", async () => {
    expect((await call(createWedding, { body: input() })).status).toBe(401);
  });
});
