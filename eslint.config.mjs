// ESLint flat config. The `no-restricted-imports` blocks below encode the
// dependency rules from docs/CODEBASE_ARCHITECTURE.md ("Dependency rules").
// `import "server-only"` is the second fence: it fails the build if a client
// bundle ever pulls in server code.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const SERVER_PACKAGES = {
  regex: "^(mongoose|mongodb|resend|@aws-sdk/.+|@node-rs/argon2|server-only|next/headers)$",
  message: "Server-only package: client code must call the REST API instead.",
};

const PROVIDER_SDKS = {
  regex: "^(resend|@aws-sdk/.+)$",
  message:
    "Business code never touches provider SDKs. Use EmailService / StorageService / VendorDiscoveryService from @/server/*.",
};

const MODULE_INTERNALS = {
  regex: "^@/modules/[^/]+/[^/]+\\.(model|repository|service|mapper)$",
  message:
    "Never reach into another module's model, repository, service file or mapper. Import the module's public API (@/modules/<name>) instead.",
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    "docs/**",
    "brand/**",
    "prompts/**",
    "public/**",
  ]),

  // Project-wide conventions.
  {
    rules: {
      // Function parameters are part of a signature (interfaces, stubs), so they are not flagged.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { args: "none", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },

  // Security: tokens and ids must come from node:crypto, never Math.random.
  {
    files: ["src/server/**/*.{ts,tsx}", "src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message:
            "Use node:crypto (see @/server/security/tokens) for anything security-sensitive.",
        },
      ],
    },
  },

  // Pages, layouts and other app-router files: read through module public APIs only.
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [MODULE_INTERNALS, PROVIDER_SDKS] }],
    },
  },

  // Rule 1: route handlers stay thin. Only @/server/http, a module's index and its *.schemas.
  {
    files: ["src/app/api/**/route.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^@/server/(?!http$)",
              message:
                "Route handlers may import only @/server/http from the infrastructure layer.",
            },
            {
              regex: "^@/modules/[^/]+/(?![^/]+\\.schemas$)",
              message:
                "Route handlers may import a module's index (@/modules/<name>) or its *.schemas file only — never models or repositories.",
            },
            { regex: "^\\.", message: "Use @/ aliases in route handlers." },
            PROVIDER_SDKS,
          ],
        },
      ],
    },
  },

  // Rule 2 (+ rule 3 direction): domain modules.
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            MODULE_INTERNALS,
            {
              regex: "^\\.\\./",
              message:
                "Import siblings with ./ and other modules through @/modules/<name> (their index.ts).",
            },
            {
              regex: "^@/(app|features|components|themes)(/|$)",
              message: "Domain modules must not depend on routing or UI code.",
            },
            PROVIDER_SDKS,
          ],
        },
      ],
    },
  },

  // Rule 3: infrastructure is domain-agnostic. src/server never imports modules or UI.
  {
    files: ["src/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^@/(modules|app|features|components|themes)(/|$)",
              message:
                "src/server must stay domain-agnostic. Define a port in src/server and implement it in a module; wire it in src/composition-root.ts.",
            },
            {
              regex: "^(\\.\\./)+(modules|app|features|components|themes)(/|$)",
              message: "src/server must stay domain-agnostic.",
            },
          ],
        },
      ],
    },
  },

  // Rule 4: client code may import only *.constants / *.schemas / *.types from modules.
  {
    files: [
      "src/features/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/themes/**/*.{ts,tsx}",
      "src/lib/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { regex: "^@/server(/|$)", message: "Client code must never import server code." },
            {
              regex: "^@/modules(?!/[^/]+/[^/]+\\.(constants|schemas|types)$)",
              message:
                "Client code may import only *.constants, *.schemas and *.types from modules.",
            },
            {
              regex: "^@/app(/|$)",
              message: "Client code must not import from the routing layer.",
            },
            SERVER_PACKAGES,
          ],
        },
      ],
    },
  },
]);
