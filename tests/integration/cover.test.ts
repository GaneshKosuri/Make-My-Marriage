import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as publicWebsite } from "@/app/api/public/weddings/[slug]/route";
import { POST as coverUploadUrl } from "@/app/api/wedding/cover/upload-url/route";
import { GET as getWebsite, PATCH as patchWebsite } from "@/app/api/wedding/website/route";
import { WeddingModel } from "@/modules/weddings/wedding.model";
import {
  createFakeStorageAdapter,
  setStorageServiceForTests,
  type FakeStorageAdapter,
} from "@/server/storage";

import { createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** The wedding cover photo (PRD §9.18 hero, API_DESIGN §83). */

type Handler = (request: NextRequest, context?: { params: Promise<unknown> }) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  error?: { code: string; message: string; details?: Record<string, string> };
}
interface Upload {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
  headers: Record<string, string>;
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
  const headers = new Headers({ origin: TEST_APP_URL, "x-forwarded-for": "203.0.113.20" });
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await handler(
    new NextRequest(`${TEST_APP_URL}/api/wedding/cover`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
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
  const member = await signedInUser({ wedding, role: "MANAGER" });
  return { wedding, cookie: member.cookie, weddingId: wedding._id.toString() };
}

async function requestCover(cookie: string, body = { mimeType: "image/jpeg", sizeBytes: 4096 }) {
  const result = await call(coverUploadUrl, { method: "POST", body, cookie });
  expect(result.status).toBe(200);
  return result.body.data as Upload;
}

const saveCover = (cookie: string, coverImageObjectKey: string | null) =>
  call(patchWebsite, { method: "PATCH", body: { coverImageObjectKey }, cookie });

/** Upload URL -> simulated browser PUT -> save. */
async function uploadCover(cookie: string) {
  const issued = await requestCover(cookie);
  storage.putObject(issued.objectKey, bytesOf(JPEG, 4096), "image/jpeg");
  return { issued, saved: await saveCover(cookie, issued.objectKey) };
}

describe("POST /api/wedding/cover/upload-url", () => {
  it("signs a 10-minute PUT to a staging key in the wedding's covers", async () => {
    const { cookie, weddingId } = await setup();

    const issued = await requestCover(cookie);

    expect(issued.objectKey).toMatch(
      new RegExp(`^staging/weddings/${weddingId}/covers/[0-9a-f]{32}\\.jpg$`),
    );
    expect(issued.headers).toEqual({ "Content-Type": "image/jpeg" });
    expect((Date.parse(issued.expiresAt) - Date.now()) / 60_000).toBeLessThanOrEqual(10);
  });

  it("refuses other file types, sizes over 10 MB and a weddingId", async () => {
    const { cookie, weddingId } = await setup();
    for (const body of [
      { mimeType: "image/gif", sizeBytes: 100 },
      { mimeType: "image/jpeg", sizeBytes: 10 * 1024 * 1024 + 1 },
      { mimeType: "image/jpeg", sizeBytes: 0 },
      { mimeType: "image/jpeg", sizeBytes: 100, weddingId },
    ]) {
      expect((await call(coverUploadUrl, { method: "POST", body, cookie })).status).toBe(400);
    }
  });

  it("allows 30 upload requests per wedding per hour", async () => {
    const { cookie } = await setup();
    for (let i = 0; i < 30; i += 1) await requestCover(cookie);
    const limited = await call(coverUploadUrl, {
      method: "POST",
      body: { mimeType: "image/png", sizeBytes: 100 },
      cookie,
    });
    expect(limited.status).toBe(429);
  });
});

describe("saving the cover with PATCH /api/wedding/website", () => {
  it("verifies the upload, moves it to a final key and shows it on the website", async () => {
    const { cookie, wedding, weddingId } = await setup();

    const { issued, saved } = await uploadCover(cookie);

    expect(saved.status).toBe(200);
    const coverImageUrl = (saved.body.data as { coverImageUrl: string }).coverImageUrl;
    expect(coverImageUrl).toMatch(
      new RegExp(`/get/weddings/${weddingId}/covers/[0-9a-f]{32}\\.jpg$`),
    );
    expect(storage.objects.has(issued.objectKey)).toBe(false);
    const stored = await WeddingModel.findById(wedding._id).lean();
    expect(stored!.coverImageObjectKey).toMatch(/^weddings\/[0-9a-f]{24}\/covers\//);

    expect((await call(getWebsite, { cookie })).body.data).toMatchObject({
      coverImageUrl: expect.stringContaining("/covers/"),
    });
    await call(patchWebsite, { method: "PATCH", body: { isPublished: true }, cookie });
    const site = await call(publicWebsite, { params: { slug: wedding.website.slug } });
    expect((site.body.data as { coverImageUrl: string }).coverImageUrl).toContain("/covers/");
  });

  it("replacing the cover deletes the old one; null removes it", async () => {
    const { cookie, wedding } = await setup();
    await uploadCover(cookie);
    const first = (await WeddingModel.findById(wedding._id).lean())!.coverImageObjectKey!;

    await uploadCover(cookie);
    const second = (await WeddingModel.findById(wedding._id).lean())!.coverImageObjectKey!;
    expect(second).not.toBe(first);
    expect(storage.objects.has(first)).toBe(false);
    expect(storage.objects.has(second)).toBe(true);

    const removed = await saveCover(cookie, null);
    expect(removed.body.data).toMatchObject({ coverImageUrl: null });
    expect(storage.objects.has(second)).toBe(false);
    expect((await WeddingModel.findById(wedding._id).lean())!.coverImageObjectKey).toBeNull();
  });

  it.each([
    ["not uploaded", null, 0],
    ["not an image", PNG.map(() => 0x41), 4096],
    ["a PNG signature stored as JPEG", PNG, 4096],
  ])("refuses an upload that is %s, and changes nothing else", async (_label, signature, size) => {
    const { cookie } = await setup();
    const issued = await requestCover(cookie);
    if (signature) storage.putObject(issued.objectKey, bytesOf(signature, size), "image/jpeg");

    const result = await call(patchWebsite, {
      method: "PATCH",
      body: { coverImageObjectKey: issued.objectKey, theme: "MODERN" },
      cookie,
    });

    expect(result.status).toBe(400);
    expect(result.body.error?.code).toBe("UPLOAD_ERROR");
    expect((await call(getWebsite, { cookie })).body.data).toMatchObject({
      theme: "CLASSIC",
      coverImageUrl: null,
    });
  });

  it("refuses another wedding's upload, a gallery key and a made-up key", async () => {
    const { cookie, weddingId } = await setup();
    const other = await setup();
    const theirs = await requestCover(other.cookie);
    storage.putObject(theirs.objectKey, bytesOf(JPEG, 4096), "image/jpeg");
    for (const key of [
      theirs.objectKey,
      `staging/weddings/${weddingId}/gallery/${"a".repeat(32)}.jpg`,
      `weddings/${weddingId}/covers/../../x.jpg`,
    ]) {
      const result = await saveCover(cookie, key);
      expect(result.status).toBe(400);
      expect(result.body.error?.code).toBe("UPLOAD_ERROR");
    }
    expect(storage.objects.has(theirs.objectKey)).toBe(true);
  });
});
