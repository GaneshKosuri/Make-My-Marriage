/**
 * Member request schemas (Zod, `.strict()`). Isomorphic: the invite dialog and
 * role menu reuse them.
 */
import { z } from "zod";

import { objectId } from "@/lib/object-id";

import { emailField } from "@/modules/auth/auth.schemas";

import { MEMBER_ROLES } from "./member.constants";

export const membershipIdParams = z.object({ membershipId: objectId }).strict();
export const memberInvitationIdParams = z.object({ invitationId: objectId }).strict();

const roleField = z.enum(MEMBER_ROLES, "Choose Admin or Manager");

/** API_DESIGN §22 */
export const inviteMemberSchema = z.object({ email: emailField, role: roleField }).strict();

/** API_DESIGN §27 */
export const changeMemberRoleSchema = z.object({ role: roleField }).strict();
