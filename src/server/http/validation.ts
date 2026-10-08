import "server-only";

import type { z } from "zod";

export type ValidationSource = "params" | "query" | "body";

/**
 * Flattens Zod issues into the `details` map of the error envelope
 * (API_DESIGN §7): `{ "email": "Invalid email address" }`.
 * Body fields are unprefixed (they map onto form fields); query and path
 * params are prefixed with `query.` / `params.`. The first issue per field wins.
 */
export function zodErrorToDetails(
  error: z.ZodError,
  source: ValidationSource = "body",
): Record<string, string> {
  const prefix = source === "body" ? "" : `${source}.`;
  const details: Record<string, string> = {};
  const put = (path: readonly PropertyKey[], message: string) => {
    const key = path.length ? `${prefix}${path.map(String).join(".")}` : prefix ? source : "_root";
    details[key] ??= message;
  };

  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) put([...issue.path, key], "Unknown field");
    } else {
      put(issue.path, issue.message);
    }
  }
  return details;
}
