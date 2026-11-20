import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as downloadPhoto } from "@/app/api/photos/[photoId]/download/route";
import { DELETE as deletePhoto } from "@/app/api/photos/[photoId]/route";
import { GET as listPhotos, POST as confirmPhoto } from "@/app/api/photos/route";
import { POST as uploadUrl } from "@/app/api/photos/upload-url/route";
import { EventModel } from "@/modules/events/event.model";
import { PhotoModel } from "@/modules/photos/photo.model";
import { AppError } from "@/server/errors";
import {
  createFakeStorageAdapter,
  setStorageServiceForTests,
  type FakeStorageAdapter,
} from "@/server/storage";

import { createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** The family gallery end to end through the route handlers (PRD §9.20–9.21, API §75–78). */

type Handler = (request: NextRequest, context?: { params: Promise<unknown> }) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  pagination?: { nextCursor: string | null; total?: number };
  error?: { code: string; message: string; details?: Record<string, string> };
}
interface UploadBody {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
  headers: Record<string, string>;
  preview: { uploadUrl: string; objectKey: string; headers: Record<string, string> } | null;
}
interface PhotoBody {
  id: string;
  eventId: string | null;
  url: string;
  previewUrl: string | null;
  originalFilename: string | null;
  mimeType: string;
  sizeBytes: number;
  uploaderType: string;
  createdAt: string;
}

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
  const headers = new Headers({ origin: TEST_APP_URL });
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await handler(
    new NextRequest(`${TEST_APP_URL}/api/photos${query}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

// Real file signatures, padded to the declared size.
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")];
const bytesOf = (signature: number[], size: number) => {
  const bytes = new Uint8Array(size);
  bytes.set(signature);
  return bytes;
};

let storage: FakeStorageAdapter;
beforeEach(() => {
  storage = createFakeStorageAdapter();
  setStorageServiceForTests(storage);
});
afterEach(() => setStorageServiceForTests(undefined));

async function setup() {
  const owner = await createUser({ name: "Akshay Saini" });
  const wedding = await createWedding(owner._id);
  const manager = await signedInUser({ wedding, role: "MANAGER" });
  const admin = await signedInUser({ wedding, role: "ADMIN" });
  const [sangeet, roka] = await EventModel.create([
    { weddingId: wedding._id, name: "Sangeet", startsAt: new Date("2027-02-12T13:00:00Z") },
    {
      weddingId: wedding._id,
      name: "Roka",
      startsAt: new Date("2027-01-01T12:00:00Z"),
      archivedAt: new Date(),
    },
  ]);
  return {
    wedding,
    cookie: manager.cookie,
    adminCookie: admin.cookie,
    sangeet: sangeet!._id.toString(),
    roka: roka!._id.toString(),
  };
}

const photo = (extra: Record<string, unknown> = {}) => ({
  filename: "IMG_1001.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 2048,
  ...extra,
});

async function requestUpload(cookie: string, body: Record<string, unknown>) {
  const result = await call(uploadUrl, { method: "POST", body, cookie });
  expect(result.status).toBe(200);
  return result.body.data as UploadBody;
}

/** Upload URL → simulated browser PUT → confirm. */
async function upload(
  cookie: string,
  body: Record<string, unknown> = photo(),
  signature: number[] = JPEG,
) {
  const issued = await requestUpload(cookie, body);
  const { mimeType, sizeBytes } = body as { mimeType: string; sizeBytes: number };
  storage.putObject(issued.objectKey, bytesOf(signature, sizeBytes), mimeType);
  const { preview: _preview, ...confirmBody } = body;
  const confirmed = await call(confirmPhoto, {
    method: "POST",
    body: { ...confirmBody, objectKey: issued.objectKey },
    cookie,
  });
  return { issued, confirmed };
}

const list = (cookie: string, query = "") => call(listPhotos, { query, cookie });

describe("POST /api/photos/upload-url", () => {
  it("reserves a staging key in the wedding's namespace and signs a 10-minute PUT", async () => {
    const { cookie, wedding, sangeet } = await setup();

    const issued = await requestUpload(cookie, photo({ eventId: sangeet }));

    const weddingId = wedding._id.toString();
    expect(issued.objectKey).toMatch(
      new RegExp(`^staging/weddings/${weddingId}/gallery/[0-9a-f]{32}\\.jpg$`),
    );
    expect(issued.headers).toEqual({ "Content-Type": "image/jpeg" });
    const minutes = (Date.parse(issued.expiresAt) - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(9);
    expect(minutes).toBeLessThanOrEqual(10);
    expect(issued.preview).toBeNull();
    const reserved = await PhotoModel.findOne({ uploadKey: issued.objectKey }).setOptions({
      tenantScoped: false,
    });
    expect(reserved).toMatchObject({ status: "PENDING", uploaderType: "MEMBER" });
    expect(reserved!.eventId!.toString()).toBe(sangeet);
  });

  it("signs a second PUT for the grid preview when asked", async () => {
    const { cookie } = await setup();

    const issued = await requestUpload(
      cookie,
      photo({ preview: { mimeType: "image/webp", sizeBytes: 40_000 } }),
    );

    expect(issued.preview).toMatchObject({
      objectKey: expect.stringMatching(
        /^staging\/weddings\/[0-9a-f]{24}\/gallery\/[0-9a-f]{32}\.webp$/,
      ),
      headers: { "Content-Type": "image/webp" },
    });
  });

  it("refuses other file types, sizes over 10 MB, archived and other weddings' events", async () => {
    const { cookie, roka } = await setup();
    const other = await setup();
    for (const body of [
      photo({ mimeType: "image/heic" }),
      photo({ mimeType: "image/svg+xml" }),
      photo({ sizeBytes: 10 * 1024 * 1024 + 1 }),
      photo({ sizeBytes: 0 }),
      photo({ filename: "../../etc/passwd" }),
      photo({ preview: { mimeType: "image/webp", sizeBytes: 600 * 1024 } }),
      photo({ weddingId: other.wedding._id.toString() }),
    ]) {
      expect((await call(uploadUrl, { method: "POST", body, cookie })).status).toBe(400);
    }
    for (const eventId of [roka, other.sangeet]) {
      const result = await call(uploadUrl, { method: "POST", body: photo({ eventId }), cookie });
      expect(result.status).toBe(400);
      expect(result.body.error?.details).toEqual({
        eventId: "Choose an event of this wedding that is not archived",
      });
    }
  });

  it("allows 120 per member per 15 minutes, not counting refused requests", async () => {
    const { cookie, adminCookie, roka } = await setup();
    for (let i = 0; i < 3; i += 1) {
      await call(uploadUrl, { method: "POST", body: photo({ eventId: roka }), cookie });
    }
    for (let i = 0; i < 120; i += 1) {
      expect((await call(uploadUrl, { method: "POST", body: photo(), cookie })).status).toBe(200);
    }
    const limited = await call(uploadUrl, { method: "POST", body: photo(), cookie });
    expect(limited.status).toBe(429);
    expect(limited.body.error?.code).toBe("RATE_LIMITED");
    // Another member of the wedding still has their own allowance.
    expect(
      (await call(uploadUrl, { method: "POST", body: photo(), cookie: adminCookie })).status,
    ).toBe(200);
  }, 60_000);
});

describe("POST /api/photos (confirm)", () => {
  it("verifies the upload, copies it to a final key and publishes it", async () => {
    const { cookie, wedding, sangeet } = await setup();

    const { issued, confirmed } = await upload(cookie, photo({ eventId: sangeet }));

    expect(confirmed.status).toBe(201);
    const published = confirmed.body.data as PhotoBody;
    expect(published).toEqual({
      id: expect.any(String),
      eventId: sangeet,
      url: expect.stringContaining(`/get/weddings/${wedding._id.toString()}/gallery/`),
      previewUrl: null,
      originalFilename: "IMG_1001.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
      uploaderType: "MEMBER",
      createdAt: expect.any(String),
    });
    expect(published.url).not.toContain("staging");
    // The staging object is gone; a replayed PUT can't touch the published photo.
    expect(storage.objects.has(issued.objectKey)).toBe(false);
    const stored = await PhotoModel.findById(published.id).setOptions({ tenantScoped: false });
    expect(stored).toMatchObject({ status: "READY", uploadKey: issued.objectKey });
    expect(stored!.objectKey).toMatch(/^weddings\/[0-9a-f]{24}\/gallery\/[0-9a-f]{32}\.jpg$/);
  });

  it("publishes the preview with the photo, or goes on without it", async () => {
    const { cookie } = await setup();
    const body = photo({ preview: { mimeType: "image/webp", sizeBytes: 300 } });

    const issued = await requestUpload(cookie, body);
    storage.putObject(issued.objectKey, bytesOf(JPEG, 2048), "image/jpeg");
    storage.putObject(issued.preview!.objectKey, bytesOf(WEBP, 300), "image/webp");
    const withPreview = await call(confirmPhoto, {
      method: "POST",
      body: { ...photo(), objectKey: issued.objectKey },
      cookie,
    });
    expect((withPreview.body.data as PhotoBody).previewUrl).toMatch(
      /\/gallery\/previews\/[0-9a-f]{32}\.webp$/,
    );

    // The preview never arrived (or isn't an image): the photo is still published.
    const second = await requestUpload(cookie, body);
    storage.putObject(second.objectKey, bytesOf(JPEG, 2048), "image/jpeg");
    storage.putObject(second.preview!.objectKey, bytesOf(PNG, 300), "image/webp");
    const without = await call(confirmPhoto, {
      method: "POST",
      body: { ...photo(), objectKey: second.objectKey },
      cookie,
    });
    expect(without.status).toBe(201);
    expect((without.body.data as PhotoBody).previewUrl).toBeNull();
  });

  it("is idempotent: confirming again answers with the same photo", async () => {
    const { cookie } = await setup();
    const { issued, confirmed } = await upload(cookie);

    const again = await call(confirmPhoto, {
      method: "POST",
      body: { ...photo(), objectKey: issued.objectKey },
      cookie,
    });

    expect(again.status).toBe(201);
    expect((again.body.data as PhotoBody).id).toBe((confirmed.body.data as PhotoBody).id);
    expect((await list(cookie)).body.pagination?.total).toBe(1);
  });

  it.each([
    ["a PNG signature for a JPEG", PNG, "image/jpeg", 2048],
    ["a different size", JPEG, "image/jpeg", 1000],
    ["a different type", JPEG, "image/png", 2048],
  ])("refuses an upload with %s", async (_label, signature, storedType, storedSize) => {
    const { cookie } = await setup();
    const issued = await requestUpload(cookie, photo());
    storage.putObject(issued.objectKey, bytesOf(signature, storedSize), storedType);

    const result = await call(confirmPhoto, {
      method: "POST",
      body: { ...photo(), objectKey: issued.objectKey },
      cookie,
    });

    expect(result.status).toBe(400);
    expect(result.body.error?.code).toBe("UPLOAD_ERROR");
    expect((await list(cookie)).body.pagination?.total).toBe(0);
  });

  it("refuses metadata that differs from the reservation, and a missing upload", async () => {
    const { cookie, sangeet } = await setup();
    const issued = await requestUpload(cookie, photo());

    const missing = await call(confirmPhoto, {
      method: "POST",
      body: { ...photo(), objectKey: issued.objectKey },
      cookie,
    });
    expect(missing.body.error?.code).toBe("UPLOAD_ERROR");

    storage.putObject(issued.objectKey, bytesOf(JPEG, 2048), "image/jpeg");
    for (const changed of [{ sizeBytes: 4096 }, { filename: "other.jpg" }, { eventId: sangeet }]) {
      const result = await call(confirmPhoto, {
        method: "POST",
        body: { ...photo(changed), objectKey: issued.objectKey },
        cookie,
      });
      expect(result.status).toBe(400);
      expect(result.body.error?.code).toBe("UPLOAD_ERROR");
    }
  });

  it("refuses an upload expired more than 24 hours ago", async () => {
    const { cookie } = await setup();
    const issued = await requestUpload(cookie, photo());
    storage.putObject(issued.objectKey, bytesOf(JPEG, 2048), "image/jpeg");
    await PhotoModel.updateOne(
      { uploadKey: issued.objectKey },
      { $set: { expiresAt: new Date(Date.now() - 25 * 60 * 60 * 1000) } },
    ).setOptions({ tenantScoped: false });

    const result = await call(confirmPhoto, {
      method: "POST",
      body: { ...photo(), objectKey: issued.objectKey },
      cookie,
    });

    expect(result.status).toBe(400);
    expect(result.body.error?.message).toBe(
      "This upload has expired. Please upload the photo again.",
    );
  });

  it("answers 404 for another member's or another wedding's upload", async () => {
    const { cookie, adminCookie } = await setup();
    const other = await setup();
    const issued = await requestUpload(cookie, photo());
    storage.putObject(issued.objectKey, bytesOf(JPEG, 2048), "image/jpeg");
    const body = { ...photo(), objectKey: issued.objectKey };

    expect((await call(confirmPhoto, { method: "POST", body, cookie: adminCookie })).status).toBe(
      404,
    );
    expect((await call(confirmPhoto, { method: "POST", body, cookie: other.cookie })).status).toBe(
      404,
    );
    expect((await call(confirmPhoto, { method: "POST", body, cookie })).status).toBe(201);
  });

  it("won't publish a deleted photo again", async () => {
    const { cookie } = await setup();
    const { issued, confirmed } = await upload(cookie);
    const photoId = (confirmed.body.data as PhotoBody).id;
    await call(deletePhoto, { method: "DELETE", params: { photoId }, cookie });

    storage.putObject(issued.objectKey, bytesOf(JPEG, 2048), "image/jpeg");
    const again = await call(confirmPhoto, {
      method: "POST",
      body: { ...photo(), objectKey: issued.objectKey },
      cookie,
    });
    expect(again.status).toBe(404);
  });
});

describe("GET /api/photos", () => {
  it("lists published photos newest first by album, with cursor pages and totals", async () => {
    const { cookie, sangeet } = await setup();
    const ids: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const { confirmed } = await upload(cookie, photo({ eventId: i < 3 ? sangeet : null }));
      ids.push((confirmed.body.data as PhotoBody).id);
    }
    await requestUpload(cookie, photo()); // pending: never listed

    const first = await list(cookie, "?limit=2");
    expect((first.body.data as PhotoBody[]).map((p) => p.id)).toEqual([ids[4], ids[3]]);
    expect(first.body.pagination).toEqual({ nextCursor: expect.any(String), total: 5 });
    const second = await list(cookie, `?limit=2&cursor=${first.body.pagination!.nextCursor}`);
    expect((second.body.data as PhotoBody[]).map((p) => p.id)).toEqual([ids[2], ids[1]]);
    const last = await list(cookie, `?limit=2&cursor=${second.body.pagination!.nextCursor}`);
    expect((last.body.data as PhotoBody[]).map((p) => p.id)).toEqual([ids[0]]);
    expect(last.body.pagination?.nextCursor).toBeNull();

    const sangeetAlbum = await list(cookie, `?eventId=${sangeet}`);
    expect(sangeetAlbum.body.pagination?.total).toBe(3);
    const memories = await list(cookie, "?eventId=other");
    expect((memories.body.data as PhotoBody[]).map((p) => p.id)).toEqual([ids[4], ids[3]]);
  });

  it("refuses a cursor from another album, and never lists another wedding's photos", async () => {
    const { cookie, sangeet } = await setup();
    const other = await setup();
    await upload(cookie);
    await upload(cookie);
    const page = await list(cookie, "?limit=1");

    const replayed = await list(
      cookie,
      `?limit=1&eventId=${sangeet}&cursor=${page.body.pagination!.nextCursor}`,
    );
    expect(replayed.status).toBe(400);
    expect((await list(other.cookie)).body.pagination?.total).toBe(0);
    expect((await list(cookie, `?eventId=${other.sangeet}`)).body.pagination?.total).toBe(0);
  });
});

describe("GET /api/photos/:id/download and DELETE /api/photos/:id", () => {
  it("signs a download under the original name", async () => {
    const { cookie } = await setup();
    const { confirmed } = await upload(cookie);
    const photoId = (confirmed.body.data as PhotoBody).id;

    const result = await call(downloadPhoto, { params: { photoId }, cookie });

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({
      url: expect.stringMatching(/\/gallery\/[0-9a-f]{32}\.jpg$/),
    });
  });

  it("deletes the stored photo and preview, then hides it; 404 for another wedding's", async () => {
    const { cookie, adminCookie } = await setup();
    const other = await setup();
    const issued = await requestUpload(
      cookie,
      photo({ preview: { mimeType: "image/jpeg", sizeBytes: 200 } }),
    );
    storage.putObject(issued.objectKey, bytesOf(JPEG, 2048), "image/jpeg");
    storage.putObject(issued.preview!.objectKey, bytesOf(JPEG, 200), "image/jpeg");
    const confirmed = await call(confirmPhoto, {
      method: "POST",
      body: { ...photo(), objectKey: issued.objectKey },
      cookie,
    });
    const photoId = (confirmed.body.data as PhotoBody).id;
    expect(storage.objects.size).toBe(2);

    expect(
      (await call(deletePhoto, { method: "DELETE", params: { photoId }, cookie: other.cookie }))
        .status,
    ).toBe(404);
    expect((await call(downloadPhoto, { params: { photoId }, cookie: other.cookie })).status).toBe(
      404,
    );

    // Any member can delete any photo.
    const deleted = await call(deletePhoto, {
      method: "DELETE",
      params: { photoId },
      cookie: adminCookie,
    });
    expect(deleted.status).toBe(200);
    expect(deleted.body.data).toEqual({ success: true });
    expect(storage.objects.size).toBe(0);
    expect((await list(cookie)).body.pagination?.total).toBe(0);
    expect((await call(downloadPhoto, { params: { photoId }, cookie })).status).toBe(404);
    expect(
      (await call(deletePhoto, { method: "DELETE", params: { photoId }, cookie })).status,
    ).toBe(404);
  });

  it("keeps the photo when storage fails, so deleting can be retried", async () => {
    const { cookie } = await setup();
    const { confirmed } = await upload(cookie);
    const photoId = (confirmed.body.data as PhotoBody).id;
    setStorageServiceForTests({
      ...storage,
      delete: async () => {
        throw new AppError("EXTERNAL_SERVICE_ERROR", "Photo storage is temporarily unavailable.");
      },
    });

    const failed = await call(deletePhoto, { method: "DELETE", params: { photoId }, cookie });

    expect(failed.status).toBe(503);
    setStorageServiceForTests(storage);
    expect((await list(cookie)).body.pagination?.total).toBe(1);
  });

  it("needs a signed-in member", async () => {
    expect((await list("")).status).toBe(401);
  });
});
