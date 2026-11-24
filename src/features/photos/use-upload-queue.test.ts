// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useUploadQueue } from "./use-upload-queue";

const ENDPOINTS = { uploadUrl: "/api/photos/upload-url", confirm: "/api/photos" };

type Answer = { status: number; body: unknown } | "network";
let confirmAnswers: Answer[];
let issuedCount = 0;
const calls: { path: string; body: Record<string, unknown> | undefined }[] = [];
const puts: string[] = [];

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  const path = new URL(url, "http://localhost").pathname;
  const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
  calls.push({ path, body });
  if (path === ENDPOINTS.uploadUrl) {
    issuedCount += 1;
    return json(200, {
      data: {
        uploadUrl: `https://storage.example/put/${issuedCount}`,
        objectKey: `staging/weddings/w/gallery/key-${issuedCount}.jpg`,
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        headers: { "Content-Type": "image/jpeg" },
        preview: null,
      },
    });
  }
  const answer = confirmAnswers.shift() ?? { status: 201, body: { data: { id: "p1" } } };
  if (answer === "network") throw new TypeError("Failed to fetch");
  return json(answer.status, answer.body);
});

class FakeXhr {
  status = 0;
  upload = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private url = "";
  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader() {}
  send() {
    puts.push(this.url);
    setTimeout(() => {
      this.status = 200;
      this.onload?.();
    }, 0);
  }
}

const photo = (name = "pheras.jpg") =>
  new File([new Uint8Array(100)], name, { type: "image/jpeg" });
const confirms = () => calls.filter((call) => call.path === ENDPOINTS.confirm);

beforeEach(() => {
  confirmAnswers = [];
  issuedCount = 0;
  calls.length = 0;
  puts.length = 0;
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});
afterEach(() => vi.unstubAllGlobals());

async function chooseAndUpload(files: File[]) {
  const hook = renderHook(() => useUploadQueue(ENDPOINTS));
  act(() => {
    hook.result.current.add(files);
  });
  await act(async () => {
    await hook.result.current.start(null);
  });
  return hook;
}

describe("useUploadQueue", () => {
  it("retries a lost confirm without uploading again (QA G2)", async () => {
    confirmAnswers = ["network"];
    const hook = await chooseAndUpload([photo()]);
    const failed = hook.result.current.items[0]!;
    expect(failed).toMatchObject({ status: "failed", retryable: true, problem: null });

    await act(async () => {
      await hook.result.current.retry(failed.id, null);
    });

    expect(hook.result.current.items[0]!.status).toBe("done");
    expect(calls.filter((call) => call.path === ENDPOINTS.uploadUrl)).toHaveLength(1);
    expect(puts).toHaveLength(1);
    expect(confirms()).toHaveLength(2);
    expect(confirms().map((call) => call.body?.objectKey)).toEqual([
      "staging/weddings/w/gallery/key-1.jpg",
      "staging/weddings/w/gallery/key-1.jpg",
    ]);
  });

  it("shows the server's reason for a refusal, offers no retry, and lets the photo be removed (QA G1)", async () => {
    confirmAnswers = [
      {
        status: 403,
        body: { error: { code: "FORBIDDEN", message: "The family has turned off uploads." } },
      },
    ];
    const hook = await chooseAndUpload([photo()]);

    expect(hook.result.current.items[0]).toMatchObject({
      status: "failed",
      problem: "The family has turned off uploads.",
      retryable: false,
    });
    act(() => hook.result.current.remove(hook.result.current.items[0]!.id));
    expect(hook.result.current.items).toEqual([]);
  });

  it("explains a closed gallery and a refused file", async () => {
    confirmAnswers = [
      { status: 404, body: { error: { code: "NOT_FOUND", message: "Not found." } } },
      {
        status: 400,
        body: {
          error: { code: "UPLOAD_ERROR", message: "This file isn't a JPEG, PNG or WebP photo." },
        },
      },
    ];
    const hook = await chooseAndUpload([photo("a.jpg"), photo("b.jpg")]);

    expect(hook.result.current.items.map((item) => [item.problem, item.retryable])).toEqual([
      ["The gallery is closed, or this album isn't available any more.", false],
      ["This file isn't a JPEG, PNG or WebP photo.", true],
    ]);
  });

  it("starts over after a failed server check (a fresh upload may pass)", async () => {
    confirmAnswers = [
      {
        status: 400,
        body: { error: { code: "UPLOAD_ERROR", message: "We couldn't find the uploaded photo." } },
      },
    ];
    const hook = await chooseAndUpload([photo()]);

    await act(async () => {
      await hook.result.current.retry(hook.result.current.items[0]!.id, null);
    });

    expect(hook.result.current.items[0]!.status).toBe("done");
    expect(calls.filter((call) => call.path === ENDPOINTS.uploadUrl)).toHaveLength(2);
    expect(confirms().map((call) => call.body?.objectKey)).toEqual([
      "staging/weddings/w/gallery/key-1.jpg",
      "staging/weddings/w/gallery/key-2.jpg",
    ]);
  });
});
