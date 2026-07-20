/**
 * Migration-fixture sync: every fenced svelte block in the upgrading guide is
 * a real, type-checked fixture file (ADR 0013 — migration examples must be
 * real Svelte source, not prose). Fixtures under
 * packages/svelte/tests/migrations/ are the source of truth; the guide embeds
 * them verbatim modulo one normalization (the public import specifier
 * "@ggsvelte/svelte" — fixtures import "../../src/lib/index.js" because the
 * workspace has no self-link for the package name).
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { UPGRADING_MD } from "./gen-llms.ts";

const MIGRATIONS_DIR = join(import.meta.dir, "..", "packages", "svelte", "tests", "migrations");

function guideSvelteBlocks(md: string): string[] {
  return [...md.matchAll(/```svelte(?:\s+(?:complete|fragment|copy))*\n([\s\S]*?)```/g)].map(
    (match) => match[1]!.trim(),
  );
}

function fixtureFiles(extension: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const name of readdirSync(MIGRATIONS_DIR)) {
    if (!name.endsWith(extension)) continue;
    files.set(name, readFileSync(join(MIGRATIONS_DIR, name), "utf8").trim());
  }
  return files;
}

describe("upgrading-guide migration fixtures", () => {
  const blocks = guideSvelteBlocks(UPGRADING_MD);
  const svelteFixtures = fixtureFiles(".svelte");

  it("has at least one svelte example per guide, and no orphan fixtures", () => {
    expect(blocks.length).toBeGreaterThan(0);
    expect(svelteFixtures.size).toBe(blocks.length);
  });

  it("embeds each fixture verbatim in the guide (modulo the public import specifier)", () => {
    const normalized = blocks.map((block) =>
      block.replaceAll('"@ggsvelte/svelte"', '"../../src/lib/index.js"'),
    );
    for (const [name, content] of svelteFixtures) {
      expect(normalized, `fixture ${name} must appear as a guide code block`).toContain(content);
    }
  });

  it("guide examples show the public import specifier, never repo-relative paths", () => {
    for (const block of blocks) {
      expect(block).toContain('from "@ggsvelte/svelte"');
      expect(block).not.toContain("src/lib");
    }
  });

  it("keeps a compile-time fixture for every deprecated type alias", () => {
    const aliases = fixtureFiles(".ts");
    const combined = [...aliases.values()].join("\n");
    for (const name of [
      "BrushSelection",
      "IntervalSelection",
      "TooltipContext",
      "PlotInspectionChange",
      "ZoomDomains",
      "ReadonlyZoomDomains",
    ]) {
      expect(combined, `alias fixture must exercise ${name}`).toContain(name);
    }
  });

  it("fixtures are inside the svelte-check type-checking scope", () => {
    // Without this include, the fixtures would parse in tests but never be
    // type-checked — exactly the drift this suite exists to prevent.
    const tsconfig = readFileSync(
      join(import.meta.dir, "..", "packages", "svelte", "tsconfig.json"),
      "utf8",
    );
    expect(tsconfig).toContain('"tests/migrations/**/*"');
  });
});
