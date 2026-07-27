/**
 * gen-geom-children unit tests + the geom-children staleness guard
 * (CI parity for `bun run geom:children:check`).
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { KNOWN_GEOMS } from "@ggsvelte/spec";

import {
  componentNameForGeom,
  expectedGeoms,
  GENERATED_HEADER,
  INDEX_PATH,
  manifestGeoms,
  REGION_END,
  REGION_START,
  renderIndexRegion,
  renderShell,
  rewriteIndexRegion,
  SHELL_MANIFEST,
  shellRelPath,
} from "./gen-geom-children.ts";

const repoRoot = join(import.meta.dir, "..");
const read = (rel: string) => readFileSync(join(repoRoot, rel), "utf8");

describe("SHELL_MANIFEST completeness", () => {
  it("geom set equals KNOWN_GEOMS exactly", () => {
    const expected = expectedGeoms();
    const actual = manifestGeoms();
    for (const g of expected) {
      expect(actual.has(g), `missing shell for geom ${g}`).toBe(true);
    }
    for (const g of actual) {
      expect(expected.has(g), `orphan shell geom ${g} not in KNOWN_GEOMS`).toBe(true);
    }
    expect(actual).toEqual(expected);
  });

  it("cardinality is 49", () => {
    expect(SHELL_MANIFEST).toHaveLength(49);
    expect(KNOWN_GEOMS).toHaveLength(49);
  });

  it("component names match derived GeomPascal from geom", () => {
    for (const s of SHELL_MANIFEST) {
      expect(s.component).toBe(componentNameForGeom(s.geom));
    }
  });

  it("only jitter uses the special template", () => {
    const special = SHELL_MANIFEST.filter((s) => s.kind !== "default");
    expect(special.map((s) => s.geom)).toEqual(["jitter"]);
  });
});

describe("renderShell", () => {
  it("emits the generated header + LayerInput type import for hex", () => {
    const hex = SHELL_MANIFEST.find((s) => s.geom === "hex")!;
    const src = renderShell(hex);
    expect(src.startsWith(GENERATED_HEADER)).toBe(true);
    expect(src).toContain("type");
    expect(src).toContain("HexParams");
    expect(src).toContain("HexLayerInput");
    expect(src).toContain("DataInput");
    expect(src).toContain('createGeomLayer("hex", () => props)');
    expect(src).not.toContain("paramKeys");
    expect(src).toContain('from "@ggsvelte/spec"');
    expect(src).toContain('from "./factory.svelte.js"');
  });

  it("emits the jitter merge for flat width/height/seed", () => {
    const jitter = SHELL_MANIFEST.find((s) => s.geom === "jitter")!;
    const src = renderShell(jitter);
    expect(src).toContain("width");
    expect(src).toContain("height");
    expect(src).toContain("seed");
    expect(src).toContain("positionParams");
    expect(src).toContain('createGeomLayer("jitter"');
    expect(src).toContain("PositionParams");
  });

  it("every script line of every generated shell is ≤ printWidth 100", () => {
    // Header comment is intentionally long; script body should stay readable.
    for (const spec of SHELL_MANIFEST) {
      const src = renderShell(spec);
      const script = src.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? "";
      for (const line of script.split("\n")) {
        if (line.length === 0) continue;
        expect(line.length, `${spec.component}: ${line}`).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("index region rewrite", () => {
  it("fails hard when either marker is missing", () => {
    expect(() => rewriteIndexRegion("export const x = 1;\n")).toThrow(/markers missing/);
    expect(() => rewriteIndexRegion(`${REGION_START}\nexport { foo };\n`)).toThrow(
      /markers missing/,
    );
    expect(() => rewriteIndexRegion(`export { foo };\n${REGION_END}\n`)).toThrow(/markers missing/);
  });

  it("replaces only the delimited region", () => {
    const before = `// keep\n${REGION_START}\nold\n${REGION_END}\n// after\n`;
    const out = rewriteIndexRegion(before, `${REGION_START}\nnew\n${REGION_END}`);
    expect(out).toBe(`// keep\n${REGION_START}\nnew\n${REGION_END}\n// after\n`);
  });

  it("emits one lifecycle-tagged export per shell (49)", () => {
    const region = renderIndexRegion();
    expect(region.startsWith(REGION_START)).toBe(true);
    expect(region.endsWith(REGION_END)).toBe(true);
    const exportCount = (region.match(/^export \{ default as /gm) ?? []).length;
    expect(exportCount).toBe(49);
  });
});

describe("geom children on disk are current", () => {
  it("every shell file matches renderShell (regenerate with bun run geom:children:gen)", () => {
    for (const spec of SHELL_MANIFEST) {
      const rel = shellRelPath(spec.component);
      expect(read(rel), rel).toBe(renderShell(spec));
    }
  });

  it("index region matches renderIndexRegion", () => {
    const index = read(INDEX_PATH);
    const start = index.indexOf(REGION_START);
    const end = index.indexOf(REGION_END);
    expect(start, "start marker present").toBeGreaterThanOrEqual(0);
    expect(end, "end marker present").toBeGreaterThan(start);
    const onDisk = index.slice(start, end + REGION_END.length);
    expect(onDisk).toBe(renderIndexRegion());
  });
});
