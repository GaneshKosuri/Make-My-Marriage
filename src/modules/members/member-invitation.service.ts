import "server-only";

import { coupleDisplayName } from "@/lib/couple";
import { formatInstant } from "@/lib/dates";
import { normalizeEmail } from "@/lib/email";
import {
  getIdentity,
  type IdentityWedding,
  type MemberContext,
  type PublicContext,
  type UserContext,
} from "@/server/auth";
import { getEnv } from "@/server/config/env";
import { isDuplicateKeyError } from "@/server/db/errors";
import { withTransaction } from "@/server/db/transaction";
import { getEmailService } from "@/server/email";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logging/logger";
import { generateToken, hashToken, isWellFormedToken } from "@/server/security/tokens";

import { MEMBER_INVITATION_TTL_DAYS, MEMBER_ROLE_LABELS } from "./member.constants";
import { loadUsers } from "./member-directory";
import type { MemberInvitationRecord } from "./member-invitation.model";
import { memberInvitationRepository } from "./member-invitation.repository";
import { toMemberInvitationDto, toPublicMemberInvitationDto } from "./member.mapper";
import type {
  AcceptMemberInvitationResultDto,
  InviteMemberInput,
  MemberInvitationDto,
  PublicMemberInvitationDto,
} from "./member.types";
import { membershipRepository } from "./membership.repository";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ALREADY_MEMBER = "This person is already a member of your wedding.";
const ALREADY_INVITED = "An invitation is already waiting for this email address.";

function conflictOnEmail(message: string): AppError {
  return new AppError("CONFLICT", message, { details: { email: message } });
}

const isExpired = (invitation: MemberInvitationRecord, now: Date) =>
  invitation.expiresAt.getTime() <= now.getTime();

/** Accept-time checks on a token's invitation (API §26 error codes). */
function assertAcceptable(
  invitation: MemberInvitationRecord | null,
  now: Date,
): asserts invitation is MemberInvitationRecord {
  if (!invitation || invitation.status === "REVOKED") throw new AppError("INVALID_TOKEN");
  if (invitation.status === "ACCEPTED") throw new AppError("INVITATION_ALREADY_ACCEPTED");
  if (isExpired(invitation, now)) throw new AppError("TOKEN_EXPIRED");
}

const findByToken = (token: string) =>
  memberInvitationRepository.findByTokenHash(hashToken("member-invite", token));

/** Thrown inside the accept transaction when the invitation changed under us. */
class InvitationChangedError extends Error {}

const expiryFrom = (now: Date) => new Date(now.getTime() + MEMBER_INVITATION_TTL_DAYS * MS_PER_DAY);

/** The join email: the raw token appears here and nowhere else. */
async function sendInvitationEmail(
  invitation: MemberInvitationRecord,
  token: string,
  wedding: IdentityWedding,
  inviterName: string,
): Promise<void> {
  await getEmailService().send({
    to: invitation.email,
    template: "member-invitation",
    props: {
      inviterName,
      coupleNames: coupleDisplayName(wedding),
      roleLabel: MEMBER_ROLE_LABELS[invitation.role],
      acceptUrl: new URL(`/join/${token}`, getEnv().NEXT_PUBLIC_APP_URL).toString(),
      expiresOn: formatInstant(invitation.expiresAt, wedding.timeZone, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
  });
}

/**
 * Member invitations (SYSTEM_DESIGN §18–20, DATABASE_DESIGN §28–30, API_DESIGN §22–26).
 * Tokens: generateToken() → HMAC("member-invite") stored; raw token only in the email link (/join/[token]).
 */
export const memberInvitationService = {
  /**
   * Admin only: not already a member, no duplicate pending invite, email
   * immediately. An expired pending invite for the same email is revoked so a
   * fresh one can replace it. If the email cannot be sent the invitation is
   * revoked again, because the link exists nowhere else. API §22.
   */
  async invite(ctx: MemberContext, input: InviteMemberInput): Promise<MemberInvitationDto> {
    const emailNormalized = normalizeEmail(input.email);
    const now = new Date();

    const { directory } = getIdentity();
    const [wedding, inviter, memberships] = await Promise.all([
      directory.findWeddingById(ctx.weddingId),
      directory.findUserById(ctx.userId),
      membershipRepository.listByWedding(ctx.weddingId),
    ]);
    if (!wedding || !inviter) throw new AppError("NOT_FOUND");

    const users = await loadUsers(memberships.map((membership) => membership.userId.toString()));
    if ([...users.values()].some((user) => normalizeEmail(user.email) === emailNormalized)) {
      throw conflictOnEmail(ALREADY_MEMBER);
    }

    const pending = await memberInvitationRepository.findPendingByEmail(
      ctx.weddingId,
      emailNormalized,
    );
    if (pending) {
      if (!isExpired(pending, now)) throw conflictOnEmail(ALREADY_INVITED);
      await memberInvitationRepository.revoke(ctx.weddingId, pending._id.toString());
    }

    const token = generateToken();
    let invitation: MemberInvitationRecord;
    try {
      invitation = await memberInvitationRepository.create(ctx.weddingId, {
        email: input.email,
        emailNormalized,
        role: input.role,
        tokenHash: hashToken("member-invite", token),
        invitedByUserId: ctx.userId,
        expiresAt: expiryFrom(now),
      });
    } catch (error) {
      // Two admins invited the same email at once (partial unique index).
      if (isDuplicateKeyError(error)) throw conflictOnEmail(ALREADY_INVITED);
      throw error;
    }

    try {
      await sendInvitationEmail(invitation, token, wedding, inviter.name);
    } catch (error) {
      await memberInvitationRepository.revoke(ctx.weddingId, invitation._id.toString());
      throw error;
    }

    logger.info("Member invited", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      invitationId: invitation._id.toString(),
      role: invitation.role,
    });
    return toMemberInvitationDto(invitation);
  },

  /** Admin only: pending and unexpired. API §23. */
  async listPending(ctx: MemberContext): Promise<MemberInvitationDto[]> {
    const invitations = await memberInvitationRepository.listPending(ctx.weddingId, new Date());
    return invitations.map(toMemberInvitationDto);
  },

  /**
   * Admin only: a fresh link for a pending invitation (decided 2026-10-29). The
   * token is swapped on the same invitation and emailed; if the email cannot be
   * sent the previous token is put back, so the link the invitee already has
   * keeps working. Expired pending invitations get a new 7-day window too.
   */
  async resend(ctx: MemberContext, invitationId: string): Promise<MemberInvitationDto> {
    const { directory } = getIdentity();
    const [current, wedding, inviter] = await Promise.all([
      memberInvitationRepository.findPendingById(ctx.weddingId, invitationId),
      directory.findWeddingById(ctx.weddingId),
      directory.findUserById(ctx.userId),
    ]);
    if (!current || !wedding || !inviter) throw new AppError("NOT_FOUND");

    const token = generateToken();
    const tokenHash = hashToken("member-invite", token);
    const invitation = await memberInvitationRepository.replaceToken(
      ctx.weddingId,
      invitationId,
      current.tokenHash,
      { tokenHash, expiresAt: expiryFrom(new Date()), invitedByUserId: ctx.userId },
    );
    // Accepted, revoked or resent by another Admin since we read it.
    if (!invitation) throw new AppError("NOT_FOUND");

    try {
      await sendInvitationEmail(invitation, token, wedding, inviter.name);
    } catch (error) {
      await memberInvitationRepository.replaceToken(ctx.weddingId, invitationId, tokenHash, {
        tokenHash: current.tokenHash,
        expiresAt: current.expiresAt,
        invitedByUserId: current.invitedByUserId.toString(),
      });
      throw error;
    }

    logger.info("Member invitation resent", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      invitationId,
    });
    return toMemberInvitationDto(invitation);
  },

  /** Admin only: status → REVOKED. Unknown, other weddings' or non-pending → NOT_FOUND. API §24. */
  async revoke(ctx: MemberContext, invitationId: string): Promise<void> {
    if (!(await memberInvitationRepository.revoke(ctx.weddingId, invitationId))) {
      throw new AppError("NOT_FOUND");
    }
    logger.info("Member invitation revoked", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      invitationId,
    });
  },

  /**
   * Public: just enough to render /join/[token]. Unknown, revoked, accepted and
   * expired links all answer NOT_FOUND, so the link reveals nothing. API §25.
   */
  async getPublicInvitation(ctx: PublicContext, token: string): Promise<PublicMemberInvitationDto> {
    if (!isWellFormedToken(token)) throw new AppError("NOT_FOUND");
    const invitation = await findByToken(token);
    if (!invitation || invitation.status !== "PENDING" || isExpired(invitation, new Date())) {
      throw new AppError("NOT_FOUND");
    }
    const wedding = await getIdentity().directory.findWeddingById(invitation.weddingId.toString());
    if (!wedding) throw new AppError("NOT_FOUND");
    return toPublicMemberInvitationDto(invitation, wedding);
  },

  /**
   * Signed-in user accepts: email must match (INVITATION_EMAIL_MISMATCH), no existing
   * membership (ALREADY_HAS_WEDDING), then membership + ACCEPTED in one transaction. API §26.
   */
  async accept(ctx: UserContext, token: string): Promise<AcceptMemberInvitationResultDto> {
    if (!isWellFormedToken(token)) throw new AppError("INVALID_TOKEN");
    const now = new Date();
    const invitation = await findByToken(token);
    assertAcceptable(invitation, now);

    const { directory } = getIdentity();
    const weddingId = invitation.weddingId.toString();
    const [wedding, user, membership] = await Promise.all([
      directory.findWeddingById(weddingId),
      directory.findUserById(ctx.userId),
      membershipRepository.findByUserIdForIdentity(ctx.userId),
    ]);
    if (!wedding) throw new AppError("INVALID_TOKEN");
    if (!user) throw new AppError("UNAUTHENTICATED");
    if (normalizeEmail(user.email) !== invitation.emailNormalized) {
      throw new AppError("INVITATION_EMAIL_MISMATCH");
    }
    if (membership) throw new AppError("ALREADY_HAS_WEDDING");

    try {
      await withTransaction(async (session) => {
        const claimed = await memberInvitationRepository.markAccepted(
          weddingId,
          invitation._id.toString(),
          ctx.userId,
          now,
          session,
        );
        if (!claimed) throw new InvitationChangedError();
        await membershipRepository.create(
          weddingId,
          { userId: ctx.userId, role: invitation.role },
          session,
        );
      });
    } catch (error) {
      // The unique userId index: this user joined a wedding in the meantime.
      if (isDuplicateKeyError(error)) throw new AppError("ALREADY_HAS_WEDDING");
      if (error instanceof InvitationChangedError) {
        assertAcceptable(await findByToken(token), new Date());
        throw new AppError("INVALID_TOKEN");
      }
      throw error;
    }

    logger.info("Member invitation accepted", {
      requestId: ctx.requestId,
      userId: ctx.userId,
      weddingId,
      invitationId: invitation._id.toString(),
    });
    return { weddingId, role: invitation.role };
  },
};
