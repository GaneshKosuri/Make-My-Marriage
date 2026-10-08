import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { API_INVENTORY, type HttpMethod } from "./api-inventory";

/**
 * Definition of done: every endpoint in API_DESIGN §106 (+ cover uploads,
 * photo download, health) exists with the right methods and auth level, and
 * nothing undocumented sneaks in.
 */

const ROOT = join(process.cwd(), "src", "app");
const API_DIR = join(ROOT, "api");
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

function findRouteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return findRouteFiles(full);
    return entry === "route.ts" ? [full] : [];
  });
}

const routeFiles = findRouteFiles(API_DIR);
const pathOf = (file: string) => `/${relative(ROOT, file).split(sep).slice(0, -1).join("/")}`;

const expected = new Map<string, Map<HttpMethod, string>>();
for (const spec of API_INVENTORY) {
  const methods = expected.get(spec.path) ?? new Map<HttpMethod, string>();
  expect(methods.has(spec.method), `duplicate inventory entry ${spec.method} ${spec.path}`).toBe(
    false,
  );
  methods.set(spec.method, spec.auth);
  expected.set(spec.path, methods);
}

const loaded = new Map<string, Record<string, unknown>>();

describe("API route map", () => {
  // The first import transforms the whole server module graph; load once, up front.
  beforeAll(async () => {
    for (const file of routeFiles) {
      loaded.set(file, (await import(/* @vite-ignore */ file)) as Record<string, unknown>);
    }
  }, 180_000);

  it("has a route file for every documented path and no undocumented ones", () => {
    expect(routeFiles.map(pathOf).sort()).toEqual([...expected.keys()].sort());
  });

  it("covers the 78 documented endpoints", () => {
    expect(API_INVENTORY).toHaveLength(78);
  });

  it.each(routeFiles.map((file) => [pathOf(file), file] as const))(
    "%s exports exactly the documented methods with the documented auth",
    (path, file) => {
      const mod = loaded.get(file) ?? {};
      const exportedMethods = HTTP_METHODS.filter((method) => method in mod);
      const methods = expected.get(path);
      expect(methods, `no inventory entry for ${path}`).toBeDefined();
      expect(exportedMethods.sort()).toEqual([...(methods?.keys() ?? [])].sort());

      for (const method of exportedMethods) {
        const handler = mod[method] as { metadata?: { auth: string } };
        expect(handler.metadata, `${method} ${path} must be built with route()`).toBeDefined();
        expect(handler.metadata?.auth).toBe(methods?.get(method as HttpMethod));
      }
    },
  );

  it("never has two different dynamic segments as siblings (static segments win in Next.js)", () => {
    const dynamicChildren = new Map<string, Set<string>>();
    for (const file of routeFiles) {
      const segments = pathOf(file).split("/").filter(Boolean);
      segments.forEach((segment, index) => {
        if (!segment.startsWith("[")) return;
        const parent = segments.slice(0, index).join("/");
        const set = dynamicChildren.get(parent) ?? new Set<string>();
        set.add(segment);
        dynamicChildren.set(parent, set);
      });
    }
    for (const [parent, names] of dynamicChildren) {
      expect(names.size, `conflicting dynamic segments under /${parent}`).toBe(1);
    }
  });
});
