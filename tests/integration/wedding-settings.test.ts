import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { PATCH as updateWedding } from "@/app/api/wedding/route";
import { dateOnlyInTimeZone } from "@/lib/dates";
import { WeddingModel } from "@/modules/weddings/wedding.model";

import { createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** PATCH /api/wedding (API_DESIGN §19, PRD §9.25 Wedding Details). */

interface ApiBody {
  data?: Record<string, unknown>;
  error?: { code: string; details?: Record<string, string> };
}

async function patch(body: unknown, cookie?: string) {
  const headers = new Headers({ origin: TEST_APP_URL, "content-type": "application/json" });
  if (cookie) headers.set("cookie", cookie);
  const response = await updateWedding(
    new NextRequest(`${TEST_APP_URL}/api/wedding`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    }),
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

async function weddingWith(role: "ADMIN" | "MANAGER") {
  const founder = await signedInUser();
  const wedding = await createWedding(founder.user._id);
  const member = await signedInUser({ wedding, role });
  return { wedding, member };
}

const stored = (id: unknown) => WeddingModel.findById(id).lean().orFail();

describe("PATCH /api/wedding", () => {
  it("lets a Manager edit the couple, date and description; the web address stays", async () => {
    const { wedding, member } = await weddingWith("MANAGER");
    const result = await patch(
      {
        brideName: " Princi Rawat ",
        groomName: "Akshay Saini",
        weddingDate: "2099-12-01",
        description: "Two families, one celebration.",
      },
      member.cookie,
    );

    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({
      id: wedding._id.toString(),
      brideName: "Princi Rawat",
      groomName: "Akshay Saini",
      weddingDate: "2099-12-01",
      description: "Two families, one celebration.",
      website: { slug: wedding.website.slug },
    });
    const after = await stored(wedding._id);
    expect(after.website.slug).toBe(wedding.website.slug);
    expect(after.brideName).toBe("Princi Rawat");
  });

  it("changes only the fields sent", async () => {
    const { wedding, member } = await weddingWith("ADMIN");
    await patch({ title: "Our big day" }, member.cookie);

    const after = await stored(wedding._id);
    expect(after).toMatchObject({
      title: "Our big day",
      brideName: "Princi",
      groomName: "Akshay",
      weddingDate: "2027-02-14",
      timeZone: "Asia/Kolkata",
    });
  });

  it("clears the title and description when they are blank", async () => {
    const { wedding, member } = await weddingWith("ADMIN");
    await patch({ title: "Our big day", description: "Hello" }, member.cookie);
    const result = await patch({ title: "", description: "  " }, member.cookie);

    expect(result.body.data).toMatchObject({ title: null, description: null });
    expect(await stored(wedding._id)).toMatchObject({ title: null, description: null });
  });

  it("replaces the location and works out the display address", async () => {
    const { member } = await weddingWith("ADMIN");
    const result = await patch(
      { location: { city: "Udaipur", state: "Rajasthan", country: "" } },
      member.cookie,
    );
    expect(result.body.data?.location).toEqual({
      city: "Udaipur",
      state: "Rajasthan",
      country: null,
      formattedAddress: "Udaipur, Rajasthan",
      latitude: null,
      longitude: null,
      googlePlaceId: null,
    });
  });

  it("rejects a new date in the past, judged in the wedding's time zone", async () => {
    const { wedding, member } = await weddingWith("ADMIN");
    const result = await patch({ weddingDate: "2020-01-01" }, member.cookie);
    expect(result).toMatchObject({
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          details: { weddingDate: "Choose today or a later date" },
        },
      },
    });
    expect((await stored(wedding._id)).weddingDate).toBe("2027-02-14");

    const today = dateOnlyInTimeZone(new Date(), "Asia/Kolkata");
    expect((await patch({ weddingDate: today }, member.cookie)).status).toBe(200);
  });

  it("accepts the unchanged date after the wedding day, so other details can still be edited", async () => {
    const { wedding, member } = await weddingWith("ADMIN");
    await WeddingModel.updateOne({ _id: wedding._id }, { $set: { weddingDate: "2020-01-01" } });

    const result = await patch(
      { weddingDate: "2020-01-01", description: "Thank you all!" },
      member.cookie,
    );
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({ description: "Thank you all!" });
  });

  it("validates fields and never accepts the web address, cover or a weddingId", async () => {
    const { member } = await weddingWith("ADMIN");
    const invalid = await patch(
      {
        brideName: "",
        weddingDate: "14/02/2027",
        timeZone: "Mars/Olympus",
        location: { city: "" },
      },
      member.cookie,
    );
    expect(invalid.status).toBe(400);
    expect(invalid.body.error?.details).toEqual({
      brideName: "Enter the bride's name",
      weddingDate: "Choose a valid date",
      timeZone: "Choose a valid time zone",
      "location.city": "Enter the city",
    });

    for (const smuggled of [
      { website: { slug: "taken" } },
      { coverImageObjectKey: "x" },
      { weddingId: "65abc00000000000000000a1" },
    ]) {
      const result = await patch(smuggled, member.cookie);
      expect(result.body.error?.code, JSON.stringify(smuggled)).toBe("VALIDATION_ERROR");
    }
  });

  it("only touches the caller's own wedding", async () => {
    const { member } = await weddingWith("ADMIN");
    const other = await weddingWith("ADMIN");
    await patch({ brideName: "Someone Else" }, member.cookie);
    expect((await stored(other.wedding._id)).brideName).toBe("Princi");
  });

  it("needs a signed-in member", async () => {
    expect((await patch({ title: "x" })).status).toBe(401);
    const outsider = await signedInUser();
    expect((await patch({ title: "x" }, outsider.cookie)).status).toBe(403);
  });
});
