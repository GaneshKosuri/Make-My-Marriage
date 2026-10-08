import "server-only";

/**
 * Task document → DTO (API_DESIGN §34 notes): nullable `assignee` (membership
 * id, name, role — never email) and `event` (id, name, archivedAt) summaries.
 *
 * TODO(Phase 2: Planning): toTaskDto(record, assignees, events).
 */
export {};
