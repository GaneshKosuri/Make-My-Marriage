import "server-only";

/**
 * Guest document → DTO. MUST strip `invitationToken` and `emailNormalized`
 * (API_DESIGN §39 notes, §44). The public invitation projection exposes only
 * the fields in API_DESIGN §50: no ids, contacts, notes or other guests.
 *
 * TODO(Phase 3: Guests): toGuestDto(record, eventSummaries), toPublicInvitationDto(...).
 */
export {};
