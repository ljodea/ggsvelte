/**
 * Gallery examples must teach the v0.20 host interaction API:
 * - inspection via <Inspect>, not GGPlot inspect=
 * - legend focus/filter via <GuideLegend … focus/filter>, not GGPlot props
 *
 * Mark-level inspect={false} (opt-out of hit testing) remains valid.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..");
const EXAMPLES = join(ROOT, "examples");

function walkExampleSvelte(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walkExampleSvelte(path);
    return name === "Example.svelte" ? [path] : [];
  });
}

/** Attributes on opening <GGPlot …> tags only (not children / handlers body). */
function ggplotOpenAttrs(source: string): string[] {
  const attrs: string[] = [];
  const re = /<GGPlot\b([^>]*)>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    attrs.push(match[1] ?? "");
  }
  return attrs;
}

const files = walkExampleSvelte(EXAMPLES);

describe("example interaction API (v0.20)", () => {
  it("finds gallery Example.svelte files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const path of files) {
    const id = relative(EXAMPLES, path);
    it(`${id}: no plot-level inspect / legendFocus / legendFilter`, () => {
      const source = readFileSync(path, "utf8");
      const offenders: string[] = [];
      for (const attrs of ggplotOpenAttrs(source)) {
        if (/\blegendFocus\b/.test(attrs)) offenders.push("legendFocus");
        if (/\blegendFilter\b/.test(attrs)) offenders.push("legendFilter");
        // Bare inspect= on GGPlot. oninspect= is a handler (prefix keeps it out).
        if (/(?<![\w])inspect\s*=/.test(attrs)) offenders.push("inspect=");
      }
      expect(offenders).toEqual([]);
    });
  }
});
