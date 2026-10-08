/**
 * Member request schemas (Zod, `.strict()`). Isomorphic.
 */
import { z } from "zod";

import { objectId } from "@/lib/object-id";

export const membershipIdParams = z.object({ membershipId: objectId }).strict();
export const memberInvitationIdParams = z.object({ invitationId: objectId }).strict();

/*
 * TODO(Phase 1: Foundation) — define with `.strict()`:
 *   - inviteMemberSchema      API_DESIGN §22  { email, role }
 *   - changeMemberRoleSchema  API_DESIGN §27  { role }
 */
