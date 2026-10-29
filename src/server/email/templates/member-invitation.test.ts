import { describe, expect, it } from "vitest";

import { renderMemberInvitationEmail } from "./member-invitation";

const props = {
  inviterName: "Akshay Saini",
  coupleNames: "Akshay & Princi",
  acceptUrl: "https://example.com/join/abc",
  expiresOn: "5 November 2026",
};

describe("renderMemberInvitationEmail", () => {
  it.each([
    ["Admin", "as an Admin."],
    ["Manager", "as a Manager."],
  ])("names the role with the right article (%s)", (roleLabel, phrase) => {
    const email = renderMemberInvitationEmail({ ...props, roleLabel });
    expect(email.text).toContain(phrase);
    expect(email.html).toContain(phrase.replace(".", ".</p>"));
  });
});
