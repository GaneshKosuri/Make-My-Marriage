/** Task request schemas (Zod, `.strict()`). Isomorphic. */
import { z } from "zod";

import { objectId } from "@/lib/object-id";

export const taskIdParams = z.object({ taskId: objectId }).strict();

/*
 * TODO(Phase 2: Planning) — define with `.strict()`:
 *   - listTasksQuerySchema  API_DESIGN §34  pageQuerySchema + status, priority,
 *                                           eventId (id | "none"), assignedMembershipId (id | "none"), mine
 *   - createTaskSchema      API_DESIGN §35  title (trim, ≤200), description (≤2000), priority=MEDIUM,
 *                                           status=TODO, nullable member/event/dueDate (ISO instant)
 *   - updateTaskSchema      API_DESIGN §37  partial, ≥1 field, never completedAt/weddingId, + version
 */
