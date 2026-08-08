/**
 * Guard (#1420): shipped examples must register every non-basic stat/geom they
 * use outside a self-registering <Geom*> shell.
 *
 * GGPlot registers the basic tier (identity + count/sum, scatter/line/bar/…)
 * at runtime and each generated <Geom*> shell registers only its own geom
 * batch + default stat. Two failure modes when that is not enough:
 *
 * 1. An example that passes `stat="<name>"` for a non-basic stat must call the
 *    matching register<Family>() function itself, or the chart throws
 *    "Stat <name> is not registered in this build" when the live example mounts.
 * 2. An example that mounts via `{spec}` without a matching <Geom*> child must
 *    call the matching register for every non-basic geom in sibling `spec.ts`,
 *    or the chart throws "Geom <name> is not registered in this build".
 *
 * This static lint parses the granular register modules for their
 * name → function-name mapping, scans every examples/* Example.svelte, and
 * requires the matching call in the file source.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

import { foldSakura } from "./quickstart/fold";
import { SAKURA_STEPS } from "./quickstart/steps";

const ROOT = join(import.meta.dir, "..");
const EXAMPLES = join(ROOT, "examples");
const REGISTER_DIR = join(ROOT, "packages/core/src/pipeline");

/** Parse every register-*.ts module once: name → registerFn for stats and geoms. */
function registerMaps(): {
  stats: Map<string, string>;
  geoms: Map<string, string>;
} {
  const stats = new Map<string, string>();
  const geoms = new Map<string, string>();
  for (const entry of readdirSync(REGISTER_DIR)) {
    if (!/^register-.+\.ts$/.test(entry)) continue;
    const source = readFileSync(join(REGISTER_DIR, entry), "utf8");
    const fn = /export function (register\w+)\(\)/.exec(source)?.[1];
    if (fn === undefined) continue;
    for (const match of source.matchAll(/registerStatFrame\("([a-z0-9_]+)"/g)) {
      const statName = match[1];
      if (statName !== undefined) stats.set(statName, fn);
    }
    for (const match of source.matchAll(/registerGeomBatch\("([a-z0-9_]+)"/g)) {
      const geomName = match[1];
      if (geomName !== undefined) geoms.set(geomName, fn);
    }
  }
  return { stats, geoms };
}

/** stat name -> register function, parsed from the granular register modules. */
function statRegisterMap(): Map<string, string> {
  return registerMaps().stats;
}

/** geom name -> register function for specialty geoms outside registerBasic(). */
function geomRegisterMap(): Map<string, string> {
  return registerMaps().geoms;
}

/** Stats every GGPlot app already has: the registerBasic() tier + identity. */
function basicStats(): Set<string> {
  const source = readFileSync(join(REGISTER_DIR, "frame-stats-register-basic.ts"), "utf8");
  const stats = new Set<string>(["identity"]);
  for (const match of source.matchAll(/registerStatFrame\("([a-z0-9_]+)"/g)) {
    const statName = match[1];
    if (statName !== undefined) stats.add(statName);
  }
  return stats;
}

/** Geoms every GGPlot app already has via registerBasic(). */
function basicGeoms(): Set<string> {
  const source = readFileSync(join(REGISTER_DIR, "geometry-register-basic.ts"), "utf8");
  const geoms = new Set<string>();
  for (const match of source.matchAll(/registerGeomBatch\("([a-z0-9_]+)"/g)) {
    const geomName = match[1];
    if (geomName !== undefined) geoms.add(geomName);
  }
  return geoms;
}

/** `.geomTile()` / `.geomDensity2dFilled()` → `tile` / `density_2d_filled`. */
function geomMethodToName(method: string): string {
  return method
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

/** Drop JS/HTML comments so comment prose cannot fake a Geom child. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/<!--[\s\S]*?-->/g, "");
}

/** True when Example.svelte mounts a portable spec without a Geom* child. */
function isBareSpecExample(source: string): boolean {
  const code = stripComments(source);
  const usesSpec = /\{spec\}|\bspec=\{/.test(code);
  const hasGeomChild = /<Geom[A-Z][A-Za-z0-9]*[\s/>]/.test(code);
  return usesSpec && !hasGeomChild;
}

function exampleFiles(): string[] {
  const files: string[] = [];
  for (const geom of readdirSync(EXAMPLES, { withFileTypes: true })) {
    if (!geom.isDirectory()) continue;
    for (const variant of readdirSync(join(EXAMPLES, geom.name), { withFileTypes: true })) {
      if (!variant.isDirectory()) continue;
      const candidate = join(EXAMPLES, geom.name, variant.name, "Example.svelte");
      try {
        readdirSync(join(EXAMPLES, geom.name, variant.name));
        files.push(candidate);
      } catch {
        continue;
      }
    }
  }
  return files.filter((file) => {
    try {
      readFileSync(file, "utf8");
      return true;
    } catch {
      return false;
    }
  });
}

describe("example stat overrides register their family (#1420)", () => {
  it('every non-basic stat="…" in an Example.svelte has its register call in-file', () => {
    const registers = statRegisterMap();
    const basic = basicStats();
    const violations: string[] = [];
    for (const file of exampleFiles()) {
      const source = readFileSync(file, "utf8");
      const stats = new Set<string>();
      for (const match of source.matchAll(/stat="([a-z0-9_]+)"/g)) {
        const statName = match[1];
        if (statName !== undefined) stats.add(statName);
      }
      for (const stat of stats) {
        if (basic.has(stat)) continue;
        const fn = registers.get(stat);
        if (fn === undefined) {
          violations.push(`${file}: stat "${stat}" has no granular register module`);
          continue;
        }
        if (!source.includes(`${fn}()`)) {
          violations.push(
            `${file}: stat="${stat}" needs ${fn}() — the shell only registers its default stat`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("the stat register map covers every granular register module", () => {
    const registers = statRegisterMap();
    // Spot-check the families examples rely on; a renamed export breaks the lint.
    expect(registers.get("ecdf")).toBe("registerEcdf");
    expect(registers.get("summary_bin")).toBe("registerSummaryBin");
  });

  it("the sakura quickstart fold registers every non-basic stat it emits", () => {
    // The folded +page.svelte is what learners copy from the getting-started
    // guide and the llms text surfaces — it must be runnable as-is (#1420).
    const registers = statRegisterMap();
    const basic = basicStats();
    const violations: string[] = [];
    for (let count = 1; count <= SAKURA_STEPS.length; count += 1) {
      const { source } = foldSakura(count);
      for (const match of source.matchAll(/stat="([a-z0-9_]+)"/g)) {
        const statName = match[1];
        if (statName === undefined || basic.has(statName)) continue;
        const fn = registers.get(statName);
        if (fn === undefined || !source.includes(`${fn}()`)) {
          violations.push(
            `fold(${count}): stat="${statName}" needs ${fn ?? "a register module"}()`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("bare-spec examples register non-basic geoms (#1420)", () => {
  it("every non-basic geom in a bare-{spec} Example.svelte has its register call in-file", () => {
    const registers = geomRegisterMap();
    const basic = basicGeoms();
    const violations: string[] = [];
    for (const file of exampleFiles()) {
      const source = readFileSync(file, "utf8");
      if (!isBareSpecExample(source)) continue;
      const specPath = join(file, "..", "spec.ts");
      let specSource: string;
      try {
        specSource = readFileSync(specPath, "utf8");
      } catch {
        violations.push(`${file}: bare {spec} mount but sibling spec.ts is missing`);
        continue;
      }
      const geoms = new Set<string>();
      for (const match of specSource.matchAll(/\.geom([A-Z][A-Za-z0-9]*)\s*\(/g)) {
        const method = match[1];
        if (method === undefined) continue;
        geoms.add(geomMethodToName(method));
      }
      for (const geom of geoms) {
        if (basic.has(geom)) continue;
        const fn = registers.get(geom);
        if (fn === undefined) {
          violations.push(`${file}: geom "${geom}" has no granular register module`);
          continue;
        }
        if (!source.includes(`${fn}()`) && !source.includes("registerAll()")) {
          violations.push(
            `${file}: bare {spec} geom "${geom}" needs ${fn}() — no <Geom*> child self-registers it`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("the geom register map covers specialty families bare-spec examples use", () => {
    const registers = geomRegisterMap();
    expect(registers.get("tile")).toBe("registerTile");
    expect(registers.get("hex")).toBe("registerHex");
    expect(registers.get("raster")).toBe("registerRaster");
  });
});
