import { randomBytes } from "node:crypto";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getQr } from "@/app/api/gallery/qr/route";
import { GET as getSettings, PATCH as patchSettings } from "@/app/api/gallery/settings/route";
import { GET as listPhotos } from "@/app/api/photos/route";
import {
  GET as publicPhotos,
  POST as publicConfirm,
} from "@/app/api/public/galleries/[token]/photos/route";
import { GET as publicGallery } from "@/app/api/public/galleries/[token]/route";
import { POST as publicUploadUrl } from "@/app/api/public/galleries/[token]/upload-url/route";
import { EventModel } from "@/modules/events/event.model";
import { WeddingModel } from "@/modules/weddings/wedding.model";
import {
  createFakeStorageAdapter,
  setStorageServiceForTests,
  type FakeStorageAdapter,
} from "@/server/storage";

import { createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** Gallery settings, QR link and the guest gallery (PRD §9.20–9.23, API §73–74, §79–82, §84). */

type Handler = (request: NextRequest, context?: { params: Promise<unknown> }) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  pagination?: { nextCursor: string | null; total?: number };
  error?: { code: string; message: string; details?: Record<string, string> };
}

let ip = "";
async function call(
  handler: Handler,
  {
    method = "GET",
    params = {},
    query = "",
    body,
    cookie,
  }: {
    method?: string;
    params?: Record<string, string>;
    query?: string;
    body?: unknown;
    cookie?: string;
  } = {},
) {
  const headers = new Headers({ origin: TEST_APP_URL, "x-forwarded-for": ip });
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await handler(
    new NextRequest(`${TEST_APP_URL}/api/gallery${query}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const jpeg = (size: number) => {
  const bytes = new Uint8Array(size);
  bytes.set(JPEG);
  return bytes;
};

let storage: FakeStorageAdapter;
beforeEach(() => {
  storage = createFakeStorageAdapter();
  setStorageServiceForTests(storage);
  // Each test is its own visitor, so per-IP limits don't carry between tests.
  ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}-${randomBytes(4).toString("hex")}`;
});
afterEach(() => setStorageServiceForTests(undefined));

async function setup({ enabled = true, uploads = true } = {}) {
  const owner = await createUser({ name: "Akshay Saini" });
  const wedding = await createWedding(owner._id);
  await WeddingModel.updateOne(
    { _id: wedding._id },
    { $set: { "gallery.isEnabled": enabled, "gallery.guestUploadsEnabled": uploads } },
  );
  const member = await signedInUser({ wedding, role: "MANAGER" });
  const [haldi, roka] = await EventModel.create([
    { weddingId: wedding._id, name: "Haldi", startsAt: new Date("2027-02-13T05:00:00Z") },
    {
      weddingId: wedding._id,
      name: "Roka",
      startsAt: new Date("2027-01-01T12:00:00Z"),
      archivedAt: new Date(),
    },
  ]);
  return {
    wedding,
    token: wedding.gallery.token,
    cookie: member.cookie,
    haldi: haldi!._id.toString(),
    roka: roka!._id.toString(),
  };
}

const photo = (extra: Record<string, unknown> = {}) => ({
  filename: "selfie.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 1024,
  ...extra,
});

/** A guest's upload, start to finish. */
async function guestUpload(token: string, body: Record<string, unknown> = photo()) {
  const issued = await call(publicUploadUrl, { method: "POST", params: { token }, body });
  if (issued.status !== 200) return issued;
  const { objectKey } = issued.body.data as { objectKey: string };
  storage.putObject(objectKey, jpeg(1024), "image/jpeg");
  return call(publicConfirm, {
    method: "POST",
    params: { token },
    body: { ...photo(), eventId: body.eventId, objectKey },
  });
}

describe("GET/PATCH /api/gallery/settings and GET /api/gallery/qr", () => {
  it("starts with both switches off and a stable link built from the app URL", async () => {
    const { cookie, token } = await setup({ enabled: false, uploads: false });

    const settings = await call(getSettings, { cookie });

    expect(settings.status).toBe(200);
    expect(settings.body.data).toEqual({
      isEnabled: false,
      guestUploadsEnabled: false,
      galleryUrl: `${TEST_APP_URL}/gallery/${token}`,
      qrUrl: `${TEST_APP_URL}/gallery/${token}`,
    });
    expect((await call(getQr, { cookie })).body.data).toEqual({
      galleryUrl: `${TEST_APP_URL}/gallery/${token}`,
    });
  });

  it("turns switches on and off without changing the link", async () => {
    const { cookie, token } = await setup({ enabled: false, uploads: false });

    const on = await call(patchSettings, { method: "PATCH", body: { isEnabled: true }, cookie });
    expect(on.body.data).toMatchObject({ isEnabled: true, guestUploadsEnabled: false });
    const both = await call(patchSettings, {
      method: "PATCH",
      body: { guestUploadsEnabled: true },
      cookie,
    });
    expect(both.body.data).toEqual({
      isEnabled: true,
      guestUploadsEnabled: true,
      galleryUrl: `${TEST_APP_URL}/gallery/${token}`,
      qrUrl: `${TEST_APP_URL}/gallery/${token}`,
    });
  });

  it("switching the gallery off also switches uploads off, so on again keeps them off (QA G3)", async () => {
    const { cookie } = await setup({ enabled: true, uploads: true });

    const off = await call(patchSettings, { method: "PATCH", body: { isEnabled: false }, cookie });
    expect(off.body.data).toMatchObject({ isEnabled: false, guestUploadsEnabled: false });
    const on = await call(patchSettings, { method: "PATCH", body: { isEnabled: true }, cookie });
    expect(on.body.data).toMatchObject({ isEnabled: true, guestUploadsEnabled: false });
  });

  it("refuses guest uploads while the gallery is off (QA G3)", async () => {
    const { cookie } = await setup({ enabled: false, uploads: false });

    for (const body of [
      { guestUploadsEnabled: true },
      { isEnabled: false, guestUploadsEnabled: true },
    ]) {
      const result = await call(patchSettings, { method: "PATCH", body, cookie });
      expect(result.status).toBe(400);
      expect(result.body.error?.details).toEqual({
        guestUploadsEnabled: "Turn the gallery on first",
      });
    }
    const both = await call(patchSettings, {
      method: "PATCH",
      body: { isEnabled: true, guestUploadsEnabled: true },
      cookie,
    });
    expect(both.body.data).toMatchObject({ isEnabled: true, guestUploadsEnabled: true });
  });

  it("refuses an empty change, unknown fields and a client weddingId", async () => {
    const { cookie, wedding } = await setup();
    for (const body of [
      {},
      { isEnabled: "yes" },
      { token: "new" },
      { isEnabled: true, weddingId: wedding._id.toString() },
    ]) {
      expect((await call(patchSettings, { method: "PATCH", body, cookie })).status).toBe(400);
    }
  });

  it("each wedding sees only its own settings", async () => {
    const one = await setup();
    const two = await setup({ enabled: false });
    await call(patchSettings, { method: "PATCH", body: { isEnabled: false }, cookie: one.cookie });

    expect((await call(getSettings, { cookie: two.cookie })).body.data).toMatchObject({
      galleryUrl: `${TEST_APP_URL}/gallery/${two.token}`,
      isEnabled: false,
    });
    expect((await call(getSettings, { cookie: "" })).status).toBe(401);
  });
});

describe("GET /api/public/galleries/:token", () => {
  it("shows the couple, the upload switch and the events, archived ones marked (QA CL)", async () => {
    const { token, haldi, roka } = await setup();

    const result = await call(publicGallery, { params: { token } });

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({
      wedding: {
        brideName: "Princi",
        groomName: "Akshay",
        weddingDate: "2027-02-14",
        timeZone: "Asia/Kolkata",
      },
      guestUploadsEnabled: true,
      events: [
        { id: roka, name: "Roka", archived: true },
        { id: haldi, name: "Haldi", archived: false },
      ],
    });
  });

  it("answers 404 when the gallery is off, the token is unknown or malformed, or the wedding is deleted", async () => {
    const off = await setup({ enabled: false });
    const deleted = await setup();
    await WeddingModel.updateOne({ _id: deleted.wedding._id }, { $set: { deletedAt: new Date() } });

    for (const token of [
      off.token,
      deleted.token,
      randomBytes(32).toString("base64url"),
      "short",
    ]) {
      const result = await call(publicGallery, { params: { token } });
      expect(result.status).toBe(404);
      expect(result.body.error?.code).toBe("NOT_FOUND");
    }
  });
});

describe("guest uploads and the guest photo list", () => {
  it("publishes a guest photo the family then sees as a guest's", async () => {
    const { token, cookie, haldi } = await setup();

    const confirmed = await guestUpload(token, photo({ eventId: haldi }));

    expect(confirmed.status).toBe(201);
    expect(confirmed.body.data).toMatchObject({
      eventId: haldi,
      uploaderType: "GUEST",
      originalFilename: null,
    });
    const family = await call(listPhotos, { cookie });
    expect(family.body.data).toEqual([
      expect.objectContaining({ uploaderType: "GUEST", originalFilename: "selfie.jpg" }),
    ]);
  });

  it("lists photos for guests by album without file names", async () => {
    const { token, haldi } = await setup();
    await guestUpload(token, photo({ eventId: haldi }));
    await guestUpload(token);

    const all = await call(publicPhotos, { params: { token } });
    expect(all.status).toBe(200);
    expect(all.body.pagination).toEqual({ nextCursor: null, total: 2 });
    expect(
      (all.body.data as { originalFilename: string | null }[]).map((p) => p.originalFilename),
    ).toEqual([null, null]);
    const haldiAlbum = await call(publicPhotos, { params: { token }, query: `?eventId=${haldi}` });
    expect(haldiAlbum.body.pagination?.total).toBe(1);
  });

  it("refuses uploads when the family turned them off, but still shows the photos", async () => {
    const { token } = await setup({ uploads: false });

    const issued = await call(publicUploadUrl, {
      method: "POST",
      params: { token },
      body: photo(),
    });

    expect(issued.status).toBe(403);
    expect(issued.body.error?.message).toBe("The family has turned off uploads.");
    expect((await call(publicPhotos, { params: { token } })).status).toBe(200);
  });

  it("refuses everything when the gallery is off, even with an issued upload", async () => {
    const { token, cookie } = await setup();
    const issued = await call(publicUploadUrl, {
      method: "POST",
      params: { token },
      body: photo(),
    });
    const { objectKey } = issued.body.data as { objectKey: string };
    storage.putObject(objectKey, jpeg(1024), "image/jpeg");
    await call(patchSettings, { method: "PATCH", body: { isEnabled: false }, cookie });

    const confirm = await call(publicConfirm, {
      method: "POST",
      params: { token },
      body: { ...photo(), objectKey },
    });
    expect(confirm.status).toBe(404);
    expect((await call(publicPhotos, { params: { token } })).status).toBe(404);
  });

  it("only takes active events of this wedding", async () => {
    const { token, roka } = await setup();
    const other = await setup();
    for (const eventId of [roka, other.haldi]) {
      const result = await call(publicUploadUrl, {
        method: "POST",
        params: { token },
        body: photo({ eventId }),
      });
      expect(result.status).toBe(400);
      expect(result.body.error?.details).toHaveProperty("eventId");
    }
  });

  it("won't confirm an upload through another wedding's link", async () => {
    const one = await setup();
    const two = await setup();
    const issued = await call(publicUploadUrl, {
      method: "POST",
      params: { token: one.token },
      body: photo(),
    });
    const { objectKey } = issued.body.data as { objectKey: string };
    storage.putObject(objectKey, jpeg(1024), "image/jpeg");

    const elsewhere = await call(publicConfirm, {
      method: "POST",
      params: { token: two.token },
      body: { ...photo(), objectKey },
    });
    expect(elsewhere.status).toBe(404);
  });

  it("allows 300 upload requests per network and gallery link per 15 minutes (QA G4)", async () => {
    const { token } = await setup();
    const other = await setup();
    for (let i = 0; i < 300; i += 1) {
      const result = await call(publicUploadUrl, {
        method: "POST",
        params: { token },
        body: photo(),
      });
      expect(result.status).toBe(200);
    }
    const limited = await call(publicUploadUrl, {
      method: "POST",
      params: { token },
      body: photo(),
    });
    expect(limited.status).toBe(429);
    // The same network can still upload to another wedding's gallery.
    const elsewhere = await call(publicUploadUrl, {
      method: "POST",
      params: { token: other.token },
      body: photo(),
    });
    expect(elsewhere.status).toBe(200);
  }, 240_000);
});
