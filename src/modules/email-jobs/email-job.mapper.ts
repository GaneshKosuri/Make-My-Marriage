import "server-only";

/**
 * Status counts → EmailBatchStatusDto (API_DESIGN §85). Recipient emails and
 * provider errors are never exposed to the client.
 *
 * TODO(Phase 3: Guests): toEmailBatchStatusDto(batchId, counts).
 */
export {};
