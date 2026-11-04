import { describe, expect, it } from "vitest";

import type { EventDto } from "@/modules/events/event.types";

import {
  emptyEventForm,
  endsNextDay,
  eventFormSchema,
  eventToForm,
  moveEndDate,
  toCreateEventBody,
  toUpdateEventBody,
} from "./event-form";

const TZ = "Asia/Kolkata";

const sangeet: EventDto = {
  id: "e1",
  name: "Sangeet",
  type: "SANGEET",
  startsAt: "2027-02-12T14:30:00.000Z",
  endsAt: "2027-02-12T19:30:00.000Z",
  venueName: "The Grand Ballroom",
  address: null,
  description: null,
  dressCode: "Indo-western",
  archivedAt: null,
  version: 2,
};

const parse = (values: unknown) => eventFormSchema.parse(values);

describe("eventToForm", () => {
  it("shows the date and wall-clock times in the wedding's time zone", () => {
    expect(eventToForm(sangeet, TZ)).toEqual({
      type: "SANGEET",
      name: "Sangeet",
      date: "2027-02-12",
      startTime: "20:00",
      // Ends after midnight: the next-day rule gives the date, so it stays blank.
      endDate: "",
      endTime: "01:00",
      venueName: "The Grand Ballroom",
      address: "",
      dressCode: "Indo-western",
      description: "",
    });
  });
});

describe("toCreateEventBody", () => {
  it("converts local times to UTC instants, an earlier end being the next day", () => {
    const values = parse({ ...eventToForm(sangeet, TZ), name: " Sangeet night " });
    expect(toCreateEventBody(values, TZ)).toEqual({
      name: "Sangeet night",
      type: "SANGEET",
      startsAt: "2027-02-12T14:30:00.000Z",
      endsAt: "2027-02-12T19:30:00.000Z",
      venueName: "The Grand Ballroom",
      address: "",
      dressCode: "Indo-western",
      description: "",
    });
  });

  it("sends no end and no type when they are left blank", () => {
    const values = parse({ ...emptyEventForm("2027-02-14", "2026-11-04"), name: "Dinner" });
    expect(toCreateEventBody(values, TZ)).toMatchObject({
      type: null,
      startsAt: "2027-02-14T12:30:00.000Z",
      endsAt: null,
    });
  });
});

describe("toUpdateEventBody", () => {
  it("sends only changed fields with the version read", () => {
    const values = parse({ ...eventToForm(sangeet, TZ), dressCode: "" });
    expect(toUpdateEventBody(values, { dressCode: true }, TZ, 2)).toEqual({
      dressCode: "",
      version: 2,
    });
  });

  it("sends both instants when the date or either time changes", () => {
    const values = parse({ ...eventToForm(sangeet, TZ), endTime: "" });
    expect(toUpdateEventBody(values, { endTime: true }, TZ, 2)).toEqual({
      startsAt: "2027-02-12T14:30:00.000Z",
      endsAt: null,
      version: 2,
    });
  });
});

describe("eventFormSchema", () => {
  it("needs a name, date and start time", () => {
    const result = eventFormSchema.safeParse({
      ...emptyEventForm("2027-02-14", "2026-11-04"),
      date: "",
      startTime: "",
    });
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      "name",
      "date",
      "startTime",
    ]);
  });

  it("refuses an end time equal to the start time", () => {
    const result = eventFormSchema.safeParse({
      ...eventToForm(sangeet, TZ),
      endTime: "20:00",
    });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ["endTime"], message: "End the event after it starts" }),
    ]);
  });
});

describe("emptyEventForm and endsNextDay", () => {
  it("starts on the wedding day, or today once it has passed", () => {
    expect(emptyEventForm("2027-02-14", "2026-11-04").date).toBe("2027-02-14");
    expect(emptyEventForm("2026-10-01", "2026-11-04").date).toBe("2026-11-04");
  });

  it("treats an end earlier than the start as the next day", () => {
    expect(endsNextDay("20:00", "01:00")).toBe(true);
    expect(endsNextDay("10:00", "14:00")).toBe(false);
    expect(endsNextDay("10:00", "")).toBe(false);
  });
});

describe("events longer than a day (review R3)", () => {
  // 12 Feb 6 PM to 14 Feb 1 AM in India.
  const twoDays: EventDto = {
    ...sangeet,
    startsAt: "2027-02-12T12:30:00.000Z",
    endsAt: "2027-02-13T19:30:00.000Z",
  };
  const duration = (body: { startsAt?: string | null; endsAt?: string | null }) =>
    new Date(body.endsAt!).getTime() - new Date(body.startsAt!).getTime();

  it("loads the end date when the same-day or next-day rule doesn't give it", () => {
    expect(eventToForm(twoDays, TZ)).toMatchObject({
      date: "2027-02-12",
      startTime: "18:00",
      endDate: "2027-02-14",
      endTime: "01:00",
    });
  });

  it("keeps the event's length when its date moves by a day", () => {
    const form = eventToForm(twoDays, TZ);
    const moved = parse({
      ...form,
      date: "2027-02-13",
      endDate: moveEndDate(form.endDate, form.date, "2027-02-13"),
    });
    const body = toUpdateEventBody(moved, { date: true, endDate: true }, TZ, 2);
    expect(body).toMatchObject({
      startsAt: "2027-02-13T12:30:00.000Z",
      endsAt: "2027-02-14T19:30:00.000Z",
    });
    expect(duration(body)).toBe(duration(twoDays));
  });

  it("lets a 24-hour event be renamed", () => {
    const allDay: EventDto = {
      ...sangeet,
      startsAt: "2027-02-12T12:30:00.000Z",
      endsAt: "2027-02-13T12:30:00.000Z",
    };
    const form = eventToForm(allDay, TZ);
    expect(form).toMatchObject({ startTime: "18:00", endDate: "2027-02-13", endTime: "18:00" });
    const renamed = eventFormSchema.safeParse({ ...form, name: "Sangeet weekend" });
    expect(renamed.success).toBe(true);
    expect(toUpdateEventBody(renamed.data!, { name: true }, TZ, 2)).toEqual({
      name: "Sangeet weekend",
      version: 2,
    });
  });

  it("still treats an earlier end time without an end date as the next day", () => {
    const values = parse({ ...eventToForm(sangeet, TZ), endDate: "" });
    expect(toCreateEventBody(values, TZ)).toMatchObject({
      startsAt: "2027-02-12T14:30:00.000Z",
      endsAt: "2027-02-12T19:30:00.000Z",
    });
  });

  it("checks the end date against the start", () => {
    const form = eventToForm(twoDays, TZ);
    const messages = (values: object) =>
      eventFormSchema
        .safeParse({ ...form, ...values })
        .error?.issues.map((issue) => [issue.path[0], issue.message]);
    expect(messages({ endDate: "2027-02-11" })).toEqual([
      ["endDate", "End on or after the start date"],
    ]);
    expect(messages({ endDate: "2027-02-12", endTime: "17:00" })).toEqual([
      ["endTime", "End the event after it starts"],
    ]);
    expect(messages({ endTime: "" })).toEqual([["endTime", "Choose the end time"]]);
  });
});
