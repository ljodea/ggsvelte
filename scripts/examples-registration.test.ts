/**
 * Guard (#1420): stat overrides in shipped examples must register their family.
 *
 * GGPlot registers the basic tier (identity + count/sum) at runtime and each
 * generated <Geom*> shell registers only its own geom batch + default stat.
 * An example that passes `stat="<name>"` for a non-basic stat must call the
 * matching register<Family>() function itself, or the chart throws
 * "Stat <name> is not registered in this build" when the live example mounts.
 *
 * This static lint parses the granular register modules for their
 * stat-name → function-name mapping, scans every examples/* Example.svelte
 * for stat overrides, and requires the matching call in the file source.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const ROOT = join(import.meta.dir, "..");
const EXAMPLES = join(ROOT, "examples");
const REGISTER_DIR = join(ROOT, "packages/core/src/pipeline");

/** stat name -> register function, parsed from the granular register modules. */
function statRegisterMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of readdirSync(REGISTER_DIR)) {
    if (!/^register-.+\.ts$/.test(entry)) continue;
    const source = readFileSync(join(REGISTER_DIR, entry), "utf8");
    const fn = /export function (register\w+)\(\)/.exec(source)?.[1];
    if (fn === undefined) continue;
    for (const match of source.matchAll(/registerStatFrame\("([a-z0-9_]+)"/g)) {
      const statName = match[1];
      if (statName !== undefined) map.set(statName, fn);
    }
  }
  return map;
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
});
