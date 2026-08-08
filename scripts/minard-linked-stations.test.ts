/**
 * Linked Select-point dual chrome was removed from Minard (product rectification).
 * Shared createPlotInteraction no longer belongs on this figurative map.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const EXAMPLE = join(ROOT, "examples/path/trajectory/Example.svelte");
const INTERACTION_API = join(ROOT, "scripts/example-interaction-api.test.ts");

describe("path/trajectory no longer publishes linked point-select", () => {
  const source = readFileSync(EXAMPLE, "utf8");

  it("does not share a createPlotInteraction controller across plots", () => {
    expect(source).not.toContain("createPlotInteraction");
    expect(source).not.toContain("interactionScope");
    expect(source).not.toMatch(/\{interaction\}/);
  });

  it("does not enable point-select on either plot", () => {
    const plots = source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [];
    expect(plots.length).toBe(2);
    for (const plot of plots) {
      expect(plot).not.toMatch(/select=\{\{\s*type:\s*["']point["']/);
    }
  });
});

describe("example-interaction-api allowlist no longer special-cases Minard", () => {
  it("does not allowlist path/trajectory for linked-view controller APIs", () => {
    const gate = readFileSync(INTERACTION_API, "utf8");
    expect(gate).not.toContain('LINKED_VIEW_ALLOWLIST = new Set(["path/trajectory"])');
  });
});
