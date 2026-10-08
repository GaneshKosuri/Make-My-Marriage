import "server-only";

import type { Aggregate, PipelineStage, Query, Schema } from "mongoose";

/**
 * Tenant guard — defence in depth for DATABASE_DESIGN §81.
 *
 * Installed on every wedding-owned model. Any find / count / update / delete /
 * distinct whose filter lacks `weddingId` throws instead of running, so a
 * forgotten tenant scope fails loudly in development and tests rather than
 * leaking another wedding's data.
 *
 * Opting out — `.setOptions({ tenantScoped: false })` — is allowed ONLY for:
 *   - token / slug resolution (guest invitation, gallery, member invitation),
 *   - identity resolution (session → membership),
 *   - the email worker (claims jobs across weddings).
 *
 * Aggregations must start with a `$match` on `weddingId`; there is no opt-out.
 * Not covered: `bulkWrite` and `insertMany` (inserts are protected by the
 * schema's `weddingId: required`).
 */

export const TENANT_SCOPED_OPTION = "tenantScoped";

export class TenantScopeError extends Error {
  override readonly name = "TenantScopeError";
}

const GUARDED_QUERY_OPERATIONS = [
  "countDocuments",
  "deleteMany",
  "deleteOne",
  "distinct",
  "estimatedDocumentCount",
  "find",
  "findOne",
  "findOneAndDelete",
  "findOneAndReplace",
  "findOneAndUpdate",
  "replaceOne",
  "updateMany",
  "updateOne",
] as const;

/** Pure check, exported for unit tests. */
export function assertTenantScopedFilter(
  modelName: string,
  operation: string,
  filter: Record<string, unknown> | undefined,
  options: Record<string, unknown> | undefined,
): void {
  if (options?.[TENANT_SCOPED_OPTION] === false) return;
  const weddingId = filter?.weddingId;
  if (weddingId === undefined || weddingId === null) {
    throw new TenantScopeError(
      `${modelName}.${operation}() must filter by weddingId (DATABASE_DESIGN §81). ` +
        `Only token/slug resolution, identity resolution and the email worker may opt out with ` +
        `.setOptions({ ${TENANT_SCOPED_OPTION}: false }).`,
    );
  }
}

/** Pure check for aggregation pipelines, exported for unit tests. */
export function assertTenantScopedPipeline(modelName: string, pipeline: PipelineStage[]): void {
  const first = pipeline[0] as { $match?: Record<string, unknown> } | undefined;
  const weddingId = first?.$match?.weddingId;
  if (weddingId === undefined || weddingId === null) {
    throw new TenantScopeError(
      `${modelName}.aggregate() must start with { $match: { weddingId } } (DATABASE_DESIGN §81).`,
    );
  }
}

export function tenantGuardPlugin(schema: Schema): void {
  for (const operation of GUARDED_QUERY_OPERATIONS) {
    schema.pre(
      operation,
      { query: true, document: false },
      function tenantGuard(this: Query<unknown, unknown>) {
        assertTenantScopedFilter(
          this.model.modelName,
          operation,
          this.getFilter() as Record<string, unknown>,
          this.getOptions() as Record<string, unknown>,
        );
      },
    );
  }

  schema.pre("aggregate", function tenantGuardAggregate(this: Aggregate<unknown>) {
    assertTenantScopedPipeline(this.model().modelName, this.pipeline());
  });
}
