/** Query-string helpers shared by list schemas (isomorphic). */
import { z } from "zod";

/** `?flag=true|false` → boolean; anything else is a VALIDATION_ERROR. */
export const queryFlag = z.enum(["true", "false"]).transform((value) => value === "true");
