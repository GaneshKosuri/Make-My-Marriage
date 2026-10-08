import "server-only";

/** Public server API of the auth module. */
export { authService, type AuthenticatedResult } from "./auth.service";
export { identityPorts } from "./identity.adapter";
