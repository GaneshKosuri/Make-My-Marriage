import "server-only";

import type { QueryFilter } from "mongoose";

import type { PageQuery } from "@/lib/pagination";
import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";
import { pageSkip } from "@/server/http/pagination";

import type { RsvpStatus } from "./guest.constants";
import { GuestModel, type GuestDoc, type GuestRecord } from "./guest.model";

export interface GuestListFilter {
  /** Literal, case-insensitive; regex metacharacters escaped (API_DESIGN §39 notes). */
  search?: string;
  rsvpStatus?: RsvpStatus;
  eventId?: string;
  invitationSent?: boolean;
}

/** The fields an organiser sets on create and update (event ids as strings). */
export interface GuestFields {
  name: string;
  email: string | null;
  phone: string | null;
  maxGuests: number;
  invitedEventIds: string[];
  notes: string | null;
}

const byId = (weddingId: string, guestId: string) => ({
  weddingId: toObjectId(weddingId, "weddingId"),
  _id: toObjectId(guestId, "guestId"),
});

/** Matches `text` literally: every regex metacharacter is escaped (API_DESIGN §39 notes). */
function literal(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/** Form fields → document fields: event ids as ObjectIds, email also normalised for search. */
function toDocFields(fields: Partial<GuestFields>): Partial<GuestDoc> {
  const { invitedEventIds, email, ...rest } = fields;
  return {
    ...rest,
    ...(email !== undefined && { email, emailNormalized: email?.toLowerCase() ?? null }),
    ...(invitedEventIds !== undefined && {
      invitedEventIds: invitedEventIds.map((id) => toObjectId(id, "invitedEventIds")),
    }),
  };
}

/** Name order ignoring case ("anita" next to "Anita"). */
const NAME_COLLATION = { locale: "en", strength: 2 } as const;

/**
 * Data access for `guests`. `weddingId` is ALWAYS the first argument, except
 * public token resolution (a sanctioned tenant-guard opt-out).
 */
export const guestRepository = {
  /**
   * Ordered by name (ignoring case), then `_id` (API_DESIGN §39 notes). Filters
   * combine with AND; search matches name, email or phone literally.
   */
  async list(
    weddingId: string,
    filter: GuestListFilter,
    page: PageQuery,
  ): Promise<{ items: GuestRecord[]; total: number }> {
    await connectToDatabase();
    const query: QueryFilter<GuestDoc> = { weddingId: toObjectId(weddingId, "weddingId") };
    if (filter.rsvpStatus) query.rsvpStatus = filter.rsvpStatus;
    if (filter.eventId) query.invitedEventIds = toObjectId(filter.eventId, "eventId");
    if (filter.invitationSent !== undefined) {
      query.invitationSentAt = filter.invitationSent ? { $ne: null } : null;
    }
    if (filter.search) {
      const pattern = literal(filter.search);
      query.$or = [{ name: pattern }, { emailNormalized: pattern }, { phone: pattern }];
    }
    const [items, total] = await Promise.all([
      GuestModel.find(query)
        .collation(NAME_COLLATION)
        .sort({ name: 1, _id: 1 })
        .skip(pageSkip(page))
        .limit(page.limit)
        .lean<GuestRecord[]>()
        .exec(),
      GuestModel.countDocuments(query).exec(),
    ]);
    return { items, total };
  },

  /** Without the invitation token (select: false). */
  async findById(weddingId: string, guestId: string): Promise<GuestRecord | null> {
    await connectToDatabase();
    return GuestModel.findOne(byId(weddingId, guestId)).lean<GuestRecord>().exec();
  },

  /** Explicit `+invitationToken` projection for the sharing URL (API_DESIGN §45). */
  async findInvitationToken(weddingId: string, guestId: string): Promise<string | null> {
    await connectToDatabase();
    const guest = await GuestModel.findOne(byId(weddingId, guestId))
      .select("+invitationToken")
      .lean<Pick<GuestDoc, "invitationToken">>()
      .exec();
    return guest?.invitationToken ?? null;
  },

  /** The guest with its invitation token, for building an email. */
  async findByIdWithToken(
    weddingId: string,
    guestId: string,
  ): Promise<(GuestRecord & { invitationToken: string }) | null> {
    await connectToDatabase();
    return GuestModel.findOne(byId(weddingId, guestId))
      .select("+invitationToken")
      .lean<GuestRecord & { invitationToken: string }>()
      .exec();
  },

  /**
   * Guests with an email address that a bulk email would reach: not yet
   * invited, still awaiting a reply, and/or among `guestIds`. Name order.
   */
  async listEmailRecipients(
    weddingId: string,
    filter: { invitationSent?: boolean; rsvpStatus?: RsvpStatus; guestIds?: readonly string[] },
  ): Promise<{ guestId: string; email: string }[]> {
    await connectToDatabase();
    const query: QueryFilter<GuestDoc> = {
      weddingId: toObjectId(weddingId, "weddingId"),
      email: { $ne: null },
    };
    if (filter.invitationSent !== undefined)
      query.invitationSentAt = filter.invitationSent ? { $ne: null } : null;
    if (filter.rsvpStatus) query.rsvpStatus = filter.rsvpStatus;
    if (filter.guestIds)
      query._id = { $in: filter.guestIds.map((id) => toObjectId(id, "guestIds")) };
    const rows = await GuestModel.find(query)
      .select({ email: 1 })
      .collation(NAME_COLLATION)
      .sort({ name: 1, _id: 1 })
      .lean<{ _id: GuestRecord["_id"]; email: string }[]>()
      .exec();
    return rows.map((row) => ({ guestId: row._id.toString(), email: row.email }));
  },

  /**
   * Records an emailed invitation or reminder. Delivery fields belong to the
   * server, so this doesn't change the version an organiser is editing from.
   */
  async recordEmailed(
    weddingId: string,
    guestId: string,
    kind: "invitation" | "reminder",
    at: Date,
  ): Promise<void> {
    await connectToDatabase();
    await GuestModel.updateOne(
      byId(weddingId, guestId),
      kind === "invitation"
        ? { $set: { invitationSentAt: at } }
        : { $set: { lastReminderSentAt: at }, $inc: { reminderCount: 1 } },
    ).exec();
  },

  /** A new guest: RSVP pending, nothing sent yet, with its stable invitation token. */
  async create(
    weddingId: string,
    input: GuestFields & { invitationToken: string },
  ): Promise<GuestRecord> {
    await connectToDatabase();
    const { invitationToken, ...fields } = input;
    const doc = await GuestModel.create({
      ...toDocFields(fields),
      weddingId: toObjectId(weddingId, "weddingId"),
      invitationToken,
    });
    const { invitationToken: _secret, ...record } = doc.toObject() as GuestRecord;
    return record as GuestRecord;
  },

  /**
   * Applies `changes` when `__v` is still `expectedVersion` and, when the party
   * size changes, only if it still covers the recorded attendance; bumps the
   * version. Null → the caller works out NOT_FOUND, CONFLICT or the capacity error.
   */
  async updateVersioned(
    weddingId: string,
    guestId: string,
    expectedVersion: number,
    changes: Partial<GuestFields>,
  ): Promise<GuestRecord | null> {
    await connectToDatabase();
    const filter: QueryFilter<GuestDoc> = { ...byId(weddingId, guestId), __v: expectedVersion };
    if (changes.maxGuests !== undefined) {
      filter.$or = [{ attendingCount: null }, { attendingCount: { $lte: changes.maxGuests } }];
    }
    return GuestModel.findOneAndUpdate(
      filter,
      { $set: toDocFields(changes), $inc: { __v: 1 } },
      { returnDocument: "after", runValidators: true },
    )
      .lean<GuestRecord>()
      .exec();
  },

  /** Hard delete (DATABASE_DESIGN §48): the invitation link stops working at once. */
  async delete(weddingId: string, guestId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await GuestModel.deleteOne(byId(weddingId, guestId)).exec();
    return result.deletedCount === 1;
  },

  /**
   * Guest (invitation) counts by RSVP status, people attending (the sum of
   * `attendingCount` on ATTENDING guests) and invitations sent, in one pass.
   * Guests in `alreadyQueued` have that email on its way and aren't counted
   * as still to email.
   */
  async rsvpSummary(
    weddingId: string,
    alreadyQueued: { invitations: readonly string[]; reminders: readonly string[] } = {
      invitations: [],
      reminders: [],
    },
  ): Promise<{
    totalGuests: number;
    byStatus: Record<RsvpStatus, number>;
    totalPeopleAttending: number;
    invitationsSent: number;
    /** Guests with an email address who haven't been emailed their invitation. */
    invitationsToEmail: number;
    /** Guests emailed their invitation, with an email address, still awaiting a reply. */
    remindersToEmail: number;
  }> {
    await connectToDatabase();
    const notIn = (guestIds: readonly string[]) => ({
      $not: [{ $in: ["$_id", guestIds.map((id) => toObjectId(id, "guestId"))] }],
    });
    const isStatus = (status: RsvpStatus) => ({
      $cond: [{ $eq: ["$rsvpStatus", status] }, 1, 0],
    });
    const [row] = await GuestModel.aggregate<{
      totalGuests: number;
      pending: number;
      attending: number;
      notAttending: number;
      totalPeopleAttending: number;
      invitationsSent: number;
      invitationsToEmail: number;
      remindersToEmail: number;
    }>([
      { $match: { weddingId: toObjectId(weddingId, "weddingId") } },
      {
        $group: {
          _id: null,
          totalGuests: { $sum: 1 },
          pending: { $sum: isStatus("PENDING") },
          attending: { $sum: isStatus("ATTENDING") },
          notAttending: { $sum: isStatus("NOT_ATTENDING") },
          totalPeopleAttending: {
            $sum: {
              $cond: [
                { $eq: ["$rsvpStatus", "ATTENDING"] },
                { $ifNull: ["$attendingCount", 0] },
                0,
              ],
            },
          },
          invitationsSent: {
            $sum: { $cond: [{ $eq: [{ $ifNull: ["$invitationSentAt", null] }, null] }, 0, 1] },
          },
          invitationsToEmail: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: [{ $ifNull: ["$email", null] }, null] },
                    { $eq: [{ $ifNull: ["$invitationSentAt", null] }, null] },
                    notIn(alreadyQueued.invitations),
                  ],
                },
                1,
                0,
              ],
            },
          },
          remindersToEmail: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: [{ $ifNull: ["$email", null] }, null] },
                    { $ne: [{ $ifNull: ["$invitationSentAt", null] }, null] },
                    { $eq: ["$rsvpStatus", "PENDING"] },
                    notIn(alreadyQueued.reminders),
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]).exec();
    return {
      totalGuests: row?.totalGuests ?? 0,
      byStatus: {
        PENDING: row?.pending ?? 0,
        ATTENDING: row?.attending ?? 0,
        NOT_ATTENDING: row?.notAttending ?? 0,
      },
      totalPeopleAttending: row?.totalPeopleAttending ?? 0,
      invitationsSent: row?.invitationsSent ?? 0,
      invitationsToEmail: row?.invitationsToEmail ?? 0,
      remindersToEmail: row?.remindersToEmail ?? 0,
    };
  },

  /**
   * Public token resolution (DATABASE_DESIGN §43): the one sanctioned lookup
   * without a wedding id, through the unique token index. The token itself is
   * not returned.
   */
  async findByInvitationToken(token: string): Promise<GuestRecord | null> {
    await connectToDatabase();
    return GuestModel.findOne({ invitationToken: token })
      .setOptions({ tenantScoped: false })
      .lean<GuestRecord>()
      .exec();
  },

  /**
   * Atomic RSVP write (API_DESIGN §51): only while `__v` is still
   * `expectedVersion` and the party size still covers the reply; bumps the
   * version. Null → the caller works out NOT_FOUND, PARTY_SIZE_CHANGED or CONFLICT.
   */
  async saveRsvp(
    weddingId: string,
    guestId: string,
    expectedVersion: number,
    rsvp: { rsvpStatus: RsvpStatus; attendingCount: number; rsvpUpdatedAt: Date },
  ): Promise<GuestRecord | null> {
    await connectToDatabase();
    return GuestModel.findOneAndUpdate(
      {
        ...byId(weddingId, guestId),
        __v: expectedVersion,
        maxGuests: { $gte: rsvp.attendingCount },
      },
      { $set: rsvp, $inc: { __v: 1 } },
      { returnDocument: "after", runValidators: true },
    )
      .lean<GuestRecord>()
      .exec();
  },
};
