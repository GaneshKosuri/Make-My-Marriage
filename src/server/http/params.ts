import "server-only";

import { z } from "zod";

import { objectId } from "@/lib/object-id";
import { TOKEN_PATTERN } from "@/server/security/tokens";

export { objectId };

/** A 43-character base64url secret from `generateToken()`. */
export const tokenParam = z.string().regex(TOKEN_PATTERN, "Invalid token");

/** `{ token }` path params for token-protected routes. Pair with `invalidParams: "not-found"`. */
export const tokenParams = z.object({ token: tokenParam }).strict();
