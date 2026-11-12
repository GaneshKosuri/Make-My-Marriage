import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn((_options: unknown) => ({ sendMail }));
vi.mock("nodemailer", () => ({ default: { createTransport } }));

const { createGmailAdapter, GmailDeliveryError } = await import("./gmail.adapter");
const { EmailQuotaError } = await import("../types");

const message = {
  from: "Make My Marriage <family@gmail.com>",
  to: "neha@example.com",
  subject: "Join the wedding",
  html: "<p>Hi</p>",
  text: "Hi",
  idempotencyKey: "job-1",
};

beforeEach(() => {
  sendMail.mockReset();
  createTransport.mockClear();
});

describe("createGmailAdapter", () => {
  it("signs in to Gmail with the app password and sends the rendered email", async () => {
    sendMail.mockResolvedValue({ messageId: "<abc@gmail.com>" });
    const adapter = createGmailAdapter({
      user: "family@gmail.com",
      appPassword: "abcdefghijklmnop",
    });

    expect(await adapter.deliver(message)).toEqual({ providerMessageId: "<abc@gmail.com>" });
    expect(createTransport).toHaveBeenCalledWith({
      service: "gmail",
      auth: { user: "family@gmail.com", pass: "abcdefghijklmnop" },
    });
    // SMTP has no idempotency key.
    expect(sendMail).toHaveBeenCalledWith({
      from: message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    expect(adapter.name).toBe("gmail");
  });

  it("explains a refused sign-in without repeating the credentials", async () => {
    sendMail.mockRejectedValue(
      Object.assign(new Error("Invalid login"), {
        code: "EAUTH",
        responseCode: 535,
        response: "535-5.7.8 Username and Password not accepted",
        command: "AUTH PLAIN",
      }),
    );
    const adapter = createGmailAdapter({
      user: "family@gmail.com",
      appPassword: "abcdefghijklmnop",
    });

    const error = await adapter.deliver(message).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GmailDeliveryError);
    expect((error as Error).message).toMatch(/GMAIL_APP_PASSWORD/);
    expect((error as Error).message).not.toContain("abcdefghijklmnop");
  });

  it("keeps the SMTP code and first reply line for other failures", async () => {
    sendMail.mockRejectedValue(
      Object.assign(new Error("Message failed"), {
        code: "EMESSAGE",
        responseCode: 550,
        response: "550-5.1.1 The email account that you tried to reach does not exist.\nMore help",
      }),
    );
    const adapter = createGmailAdapter({
      user: "family@gmail.com",
      appPassword: "abcdefghijklmnop",
    });
    const failure = adapter.deliver(message);
    await expect(failure).rejects.toThrow(
      "EMESSAGE 550 550-5.1.1 The email account that you tried to reach does not exist.",
    );
    await expect(failure).rejects.not.toBeInstanceOf(EmailQuotaError);
  });

  it.each([
    [550, "550-5.4.5 Daily user sending limit exceeded.\nMore help"],
    [421, "421 4.7.0 Try again later, closing connection."],
  ])(
    "reports Gmail's sending limit (%i) as a quota refusal, to retry later",
    async (code, reply) => {
      sendMail.mockRejectedValue(
        Object.assign(new Error("Message failed"), {
          code: "EMESSAGE",
          responseCode: code,
          response: reply,
        }),
      );
      const adapter = createGmailAdapter({
        user: "family@gmail.com",
        appPassword: "abcdefghijklmnop",
      });
      await expect(adapter.deliver(message)).rejects.toBeInstanceOf(EmailQuotaError);
    },
  );
});
