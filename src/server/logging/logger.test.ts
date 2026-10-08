import { describe, expect, it } from "vitest";

import { redact, sanitizePath } from "./logger";

describe("sanitizePath", () => {
  it.each([
    ["/invite/abc123", "/invite/[token]"],
    ["/gallery/abc123/extra", "/gallery/[token]/extra"],
    ["/join/abc123", "/join/[token]"],
    ["/reset-password/abc123", "/reset-password/[token]"],
    ["/api/public/invitations/abc123/rsvp", "/api/public/invitations/[token]/rsvp"],
    ["/api/public/galleries/abc123/photos", "/api/public/galleries/[token]/photos"],
    ["/api/public/member-invitations/abc123", "/api/public/member-invitations/[token]"],
    ["/api/member-invitations/abc123/accept", "/api/member-invitations/[token]/accept"],
    ["/api/tasks/65abc0000000000000000001", "/api/tasks/65abc0000000000000000001"],
    ["/api/public/weddings/akshay-princi-14022027", "/api/public/weddings/akshay-princi-14022027"],
  ])("%s → %s", (input, expected) => {
    expect(sanitizePath(input)).toBe(expected);
  });

  it("drops query strings", () => {
    expect(sanitizePath("/api/guests?search=sharma&cursor=x")).toBe("/api/guests");
  });
});

describe("redact", () => {
  it("redacts secret-looking keys at any depth", () => {
    const out = redact({
      requestId: "r1",
      password: "hunter2",
      nested: { sessionToken: "t", invitationToken: "t", tokenHash: "h", apiKey: "k" },
      headers: { authorization: "Bearer x", cookie: "mmm_session=x" },
      uploadUrl: "https://r2.example/upload",
      galleryUrl: "https://app.example/gallery/token",
    });
    expect(JSON.stringify(out)).not.toMatch(
      /hunter2|Bearer|mmm_session|r2\.example|gallery\/token/,
    );
    expect(out.requestId).toBe("r1");
  });

  it("redacts presigned URLs inside free-text values", () => {
    const out = redact({
      note: "https://bucket.r2.cloudflarestorage.com/k?X-Amz-Signature=abc&X-Amz-Credential=def",
    });
    expect(out.note).toBe("[REDACTED_SIGNED_URL]");
  });

  it("serialises errors without leaking secrets in their fields", () => {
    const error = Object.assign(new Error("boom"), { code: "E1" });
    const out = redact({ error }) as { error: { name: string; message: string; code: string } };
    expect(out.error).toMatchObject({ name: "Error", message: "boom", code: "E1" });
  });
});
