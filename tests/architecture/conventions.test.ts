import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Structural conventions from docs/CODEBASE_ARCHITECTURE.md that ESLint
 * cannot express on its own.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const rel = (file: string) => relative(process.cwd(), file).split(sep).join("/");
const read = (file: string) => readFileSync(file, "utf8");
const isTest = (file: string) => /\.test\.tsx?$/.test(file);
const ISOMORPHIC = /\.(constants|schemas|types)\.ts$/;
const firstStatement = (source: string) =>
  source
    .replace(/^\s*(\/\/.*\n|\/\*[\s\S]*?\*\/\s*)*/, "")
    .split("\n")[0]
    ?.trim();

const serverFiles = walk(join(SRC, "server")).filter((f) => /\.tsx?$/.test(f) && !isTest(f));
const moduleFiles = walk(join(SRC, "modules")).filter((f) => /\.tsx?$/.test(f) && !isTest(f));
const moduleServerFiles = moduleFiles.filter((f) => !ISOMORPHIC.test(f));
const isomorphicModuleFiles = moduleFiles.filter((f) => ISOMORPHIC.test(f));

describe('every server-only file starts with import "server-only" (rule 6)', () => {
  it.each(
    [...serverFiles, ...moduleServerFiles, join(SRC, "composition-root.ts")].map((f) => [
      rel(f),
      f,
    ]),
  )("%s", (_name, file) => {
    expect(firstStatement(read(file))).toBe('import "server-only";');
  });
});

describe("isomorphic module files stay isomorphic (rule 4)", () => {
  it.each(isomorphicModuleFiles.map((f) => [rel(f), f]))("%s", (_name, file) => {
    const source = read(file);
    expect(source).not.toMatch(/import\s+"server-only"/);
    expect(source).not.toMatch(/from\s+"(@\/server[^"]*|mongoose|mongodb|next\/headers)"/);
    expect(source).not.toMatch(/from\s+"\.\/[^"]+\.(model|repository|service|mapper)"/);
  });
});

describe("module anatomy", () => {
  const modules = readdirSync(join(SRC, "modules")).filter((entry) =>
    statSync(join(SRC, "modules", entry)).isDirectory(),
  );

  it("includes all eleven bounded contexts", () => {
    expect(modules.sort()).toEqual(
      [
        "auth",
        "dashboard",
        "email-jobs",
        "events",
        "expenses",
        "guests",
        "members",
        "photos",
        "tasks",
        "vendors",
        "weddings",
      ].sort(),
    );
  });

  it.each(modules)("%s has a public index.ts and constants/schemas/types", (name) => {
    const files = readdirSync(join(SRC, "modules", name));
    expect(files).toContain("index.ts");
    expect(files.some((f) => f.endsWith(".constants.ts"))).toBe(true);
    expect(files.some((f) => f.endsWith(".schemas.ts"))).toBe(true);
    expect(files.some((f) => f.endsWith(".types.ts"))).toBe(true);
  });
});

describe("tenant isolation is installed on every wedding-owned model (DATABASE_DESIGN §81)", () => {
  const modelFiles = moduleFiles.filter((f) => f.endsWith(".model.ts"));

  it.each(modelFiles.map((f) => [rel(f), f]))("%s", (name, file) => {
    const source = read(file);
    const weddingOwned = /\bweddingId:\s*\{\s*type:\s*Schema\.Types\.ObjectId/.test(source);
    if (weddingOwned) {
      expect(source).toMatch(/\.plugin\(tenantGuardPlugin\)/);
    } else {
      // Only the tenant itself and user-owned data are unguarded.
      expect(name).toMatch(/(wedding|user|session|password-reset-token)\.model\.ts$/);
    }
  });
});

describe("route handlers stay thin", () => {
  const routeFiles = walk(join(SRC, "app", "api")).filter((f) => f.endsWith("route.ts"));

  it.each(routeFiles.map((f) => [rel(f), f]))(
    "%s uses route() from @/server/http",
    (_name, file) => {
      const source = read(file);
      expect(source).toMatch(/import \{[^}]*\broute\b[^}]*\} from "@\/server\/http";/);
      expect(source).not.toMatch(/export (async )?function (GET|POST|PUT|PATCH|DELETE)\b/);
    },
  );
});
