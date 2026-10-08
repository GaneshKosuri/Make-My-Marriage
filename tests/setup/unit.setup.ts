import "@testing-library/jest-dom/vitest";

import type * as NextServer from "next/server";
import { vi } from "vitest";

import { applyTestEnv } from "./test-env";

applyTestEnv();

// `connection()` needs a Next.js request scope; tests call route handlers directly.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof NextServer>()),
  connection: async () => undefined,
}));
