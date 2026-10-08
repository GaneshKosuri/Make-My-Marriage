/**
 * Shared test environment. Values are test-only placeholders, never real
 * secrets. NODE_ENV is "test", so integrations use their fake adapters.
 */
export const TEST_APP_URL = "http://localhost:3000";
export const TEST_SESSION_SECRET = "test-only-session-secret-0123456789-abcdefghijklmnop";
export const TEST_CRON_SECRET = "test-only-cron-secret-0123456789-abcdefghijklmnop";

export function applyTestEnv(): void {
  process.env.NEXT_PUBLIC_APP_URL = TEST_APP_URL;
  process.env.SESSION_SECRET = TEST_SESSION_SECRET;
  process.env.CRON_SECRET = TEST_CRON_SECRET;
}
