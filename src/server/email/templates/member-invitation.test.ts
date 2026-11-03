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

  it("marks a resent invitation as a reminder that replaces the earlier link", () => {
    const first = renderMemberInvitationEmail({ ...props, roleLabel: "Manager" });
    const again = renderMemberInvitationEmail({ ...props, roleLabel: "Manager", reminder: true });
    expect(first.subject).toBe("Akshay Saini invited you to help plan Akshay & Princi's wedding");
    expect(again.subject).toBe(`Reminder: ${first.subject}`);
    expect(again.text).toContain("replaces the one in any earlier invitation email");
    expect(again.html).toContain("replaces the one in any earlier invitation email");
    expect(first.text).not.toContain("replaces");
  });
});
