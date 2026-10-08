import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  resolve: {
    // `@/*` → `src/*` from tsconfig.json.
    tsconfigPaths: true,
    alias: {
      // `server-only` throws outside a React Server bundle; tests run plain Node.
      "server-only": fromRoot("./tests/setup/server-only.stub.ts"),
    },
  },
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    projects: [
      {
        // Co-located unit tests. Component tests opt into jsdom with a
        // `// @vitest-environment jsdom` docblock.
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}", "tests/architecture/**/*.test.ts"],
          environment: "node",
          setupFiles: ["./tests/setup/unit.setup.ts"],
        },
      },
      {
        // API + database tests against an in-memory MongoDB replica set
        // (transactions need a replica set).
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts", "tests/security/**/*.test.ts"],
          environment: "node",
          globalSetup: ["./tests/setup/mongo-replset.global-setup.ts"],
          setupFiles: ["./tests/setup/integration.setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
