import { describe, expect, it } from "vitest";

import { emailTemplates } from "./index";
import { renderButton, renderDetails, renderLayout } from "./layout";

const sample = {
  "password-reset": {
    recipientName: "Princi",
    resetUrl: "https://makemymarriage.in/reset-password/x",
    expiresInMinutes: 60,
  },
  "member-invitation": {
    inviterName: "Akshay Saini",
    coupleNames: "Akshay & Princi",
    roleLabel: "Manager",
    acceptUrl: "https://makemymarriage.in/join/x",
    expiresOn: "18 November 2026",
  },
  "guest-invitation": {
    guestName: "Neha",
    coupleNames: "Akshay & Princi",
    weddingDate: "14 February 2027",
    invitationUrl: "https://makemymarriage.in/i/x",
  },
  "rsvp-reminder": {
    guestName: "Neha",
    coupleNames: "Akshay & Princi",
    weddingDate: "14 February 2027",
    invitationUrl: "https://makemymarriage.in/i/x",
  },
} as const;

describe("email layout", () => {
  it("escapes the title, eyebrow, preheader and footnote", () => {
    const html = renderLayout({
      preheader: "<b>pre</b>",
      eyebrow: "<i>eyebrow</i>",
      title: "Tom & <Jerry>",
      bodyHtml: "",
      footnote: '"quoted" <script>',
    });
    expect(html).toContain("Tom &amp; &lt;Jerry&gt;");
    expect(html).not.toMatch(/<(b|i|script)>/);
  });

  it("escapes detail values and labels", () => {
    expect(renderDetails([["Wedding", "A & <B>"]])).toContain("A &amp; &lt;B&gt;");
  });

  it("renders a table-cell button plus the plain link, and refuses non-http links", () => {
    const html = renderButton("https://makemymarriage.in/join/abc", "Accept invitation");
    expect(html).toContain('bgcolor="#6d1f2f"');
    expect(html.match(/href="https:\/\/makemymarriage\.in\/join\/abc"/g)).toHaveLength(2);
    expect(() => renderButton("javascript:alert(1)", "x")).toThrow();
  });

  it.each(Object.keys(sample) as (keyof typeof sample)[])(
    "%s is Gmail-safe: no images, style blocks or scripts, and has a text version",
    (name) => {
      const render = emailTemplates[name] as (props: unknown) => {
        html: string;
        text: string;
        subject: string;
      };
      const email = render(sample[name]);
      expect(email.html).not.toMatch(/<img|<style|<script|<svg/i);
      expect(email.html).toContain("Make My Marriage");
      expect(email.text.length).toBeGreaterThan(20);
      expect(email.subject).not.toBe("");
    },
  );
});
