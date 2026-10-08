import "server-only";

export {
  connectToDatabase,
  DatabaseNotConfiguredError,
  disconnectFromDatabase,
  pingDatabase,
} from "./connection";
export { baseSchemaOptions, defineModel, type WithId } from "./model";
export { isObjectIdString, objectId, OBJECT_ID_PATTERN, toObjectId } from "./object-id";
export {
  assertTenantScopedFilter,
  assertTenantScopedPipeline,
  TENANT_SCOPED_OPTION,
  tenantGuardPlugin,
  TenantScopeError,
} from "./plugins/tenant-guard";
export { withTransaction } from "./transaction";
