/**
 * fullWidth example frames drop max-width so the gallery PNG can fill the
 * content column. Live GGPlot children must use container (or omit width)
 * so the interactive upgrade does not snap from a stretched PNG down to a
 * fixed pixel width — the path/trajectory Minard page did that with
 * width={960} under journey.fullWidth.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const examplesRoot = path.join(root, "examples");

/** GGPlot width={960} / width={ 640 } — fixed px, not container. */
const FIXED_PLOT_WIDTH = /\bwidth\s*=\s*\{\s*\d+\s*\}/;

function fullWidthExampleIds(): string[] {
  const ids: string[] = [];
  for (const category of readdirSync(examplesRoot, { withFileTypes: true })) {
    if (!category.isDirectory() || category.name.startsWith(".")) continue;
    const catDir = path.join(examplesRoot, category.name);
    for (const name of readdirSync(catDir, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const metaPath = path.join(catDir, name.name, "meta.json");
      let meta: { journey?: { fullWidth?: boolean } };
      try {
        meta = JSON.parse(readFileSync(metaPath, "utf8")) as typeof meta;
      } catch {
        continue;
      }
      if (meta.journey?.fullWidth === true) {
        ids.push(`${category.name}/${name.name}`);
      }
    }
  }
  return ids.toSorted();
}

describe("fullWidth examples keep container plot width", () => {
  const ids = fullWidthExampleIds();

  it("finds at least one fullWidth journey (corpus not empty)", () => {
    expect(ids.length).toBeGreaterThan(0);
  });

  it("does not pin a fixed pixel width on GGPlot under fullWidth frames", () => {
    // Fixed width + fullWidth shell: static PNG stretches, live chart stays
    // narrow — jarring shrink on first hover/intent upgrade.
    const offenders: string[] = [];
    for (const id of ids) {
      const src = readFileSync(path.join(examplesRoot, id, "Example.svelte"), "utf8");
      if (FIXED_PLOT_WIDTH.test(src)) offenders.push(id);
    }
    expect(offenders).toEqual([]);
  });
});
