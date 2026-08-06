/**
 * Schema-derived docs/runtime catalogs must ship as precomputed data so
 * reference pages and createGeomLayer never load SpecDeclarations/TypeBox.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const generatedDir = path.join(root, "packages/spec/src/generated");

const PUBLIC_CATALOG_MODULES = [
  "packages/spec/src/geom-params.ts",
  "packages/spec/src/geom-reference.ts",
  "packages/spec/src/scale-reference.ts",
  "packages/spec/src/stat-reference.ts",
  "packages/spec/src/position-reference.ts",
  "packages/spec/src/guide-reference.ts",
  "packages/spec/src/coord-reference.ts",
] as const;

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function stripComments(source: string): string {
  return source.replaceAll(/\/\*[\s\S]*?\*\//g, "").replaceAll(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("precomputed reference catalogs", () => {
  it("keeps public catalog modules free of SpecDeclarations and typebox", () => {
    for (const rel of PUBLIC_CATALOG_MODULES) {
      const code = stripComments(read(rel));
      expect(code, rel).not.toMatch(/schema-declarations/);
      expect(code, rel).not.toMatch(/from\s*["']typebox["']/);
      expect(code, rel).not.toMatch(/from\s*["']typebox\//);
      // Must load committed data, not rebuild at import time.
      expect(code, rel).toMatch(/generated\//);
    }
  });

  it("ships generated data modules without TypeBox", () => {
    expect(existsSync(generatedDir)).toBe(true);
    const files = readdirSync(generatedDir).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const name of files) {
      const raw = readFileSync(path.join(generatedDir, name), "utf8");
      expect(raw, name).toMatch(/AUTO-GENERATED/);
      const code = stripComments(raw);
      expect(code, name).not.toMatch(/schema-declarations/);
      expect(code, name).not.toMatch(/from\s*["']typebox["']/);
    }
  });

  it("keeps vite validate carve-out free of precomputed catalog modules", () => {
    // After precompute, reference catalogs and GEOM_PARAM_KEYS are plain data
    // and belong in the thin ggsvelte-spec group (or tree-shaken alone).
    // Gen-only *-build modules are never imported by the docs bundle.
    const vite = read("apps/docs/vite.config.ts");
    const validateBlock = vite.match(
      /name:\s*["']ggsvelte-spec-validate["'][\s\S]*?priority:\s*40/,
    )?.[0];
    expect(validateBlock).toBeDefined();
    expect(validateBlock!).not.toContain("geom-reference");
    expect(validateBlock!).not.toContain("scale-reference");
    expect(validateBlock!).not.toContain("stat-reference");
    expect(validateBlock!).not.toContain("position-reference");
    expect(validateBlock!).not.toContain("guide-reference");
    expect(validateBlock!).not.toContain("coord-reference");
    expect(validateBlock!).not.toContain("geom-params");
  });
});
