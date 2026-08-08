/**
 * Slice D: gallery meta and cold-strip subtitle teach the linked Minard pair.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const META = join(ROOT, "examples/path/trajectory/meta.json");
const EXAMPLE = join(ROOT, "examples/path/trajectory/Example.svelte");

describe("path/trajectory meta polish", () => {
  const meta = JSON.parse(readFileSync(META, "utf8")) as {
    description: string;
    tags: string[];
    journey?: { pointer?: string };
  };

  it("tags the example for linked interaction discovery", () => {
    for (const tag of ["interaction", "linked-views", "inspect"] as const) {
      expect(meta.tags).toContain(tag);
    }
  });

  it("describes linked cold stations in plain language", () => {
    expect(meta.description.toLowerCase()).toMatch(/link|select|station|cold/);
  });

  it("ships a journey pointer for the dual-chart select behavior", () => {
    expect(meta.journey?.pointer ?? "").toMatch(/station|cold|select/i);
  });
});

describe("path/trajectory cold subtitle", () => {
  it("tells readers the cold strip drives the map selection", () => {
    const source = readFileSync(EXAMPLE, "utf8");
    expect(source).toMatch(/Click a reading to select the same station on the march map/);
  });
});
