import { describe, expect, it } from "vitest";

import {
  COLORBLIND_SAFE_SCHEMES,
  isColorblindSafe,
  resolveInitialScheme,
  sortPaletteSpecimens,
} from "../src/lib/catalog/palette-chooser";
import { CATEGORICAL_PALETTES } from "../src/lib/catalog/themes";

const fake = (name: string, capacity: number): { name: string; capacity: number } => ({
  name,
  capacity,
});

describe("sortPaletteSpecimens", () => {
  it("sorts alphabetically by name without mutating the input", () => {
    const input = [fake("tableau10", 10), fake("observable10", 10), fake("ipsum", 6)];
    const sorted = sortPaletteSpecimens(input, "name");
    expect(sorted.map((s) => s.name)).toEqual(["ipsum", "observable10", "tableau10"]);
    expect(input.map((s) => s.name)).toEqual(["tableau10", "observable10", "ipsum"]);
  });

  it("sorts by ascending capacity, breaking ties alphabetically", () => {
    const input = [fake("tableau10", 10), fake("ipsum", 6), fake("observable10", 10)];
    const sorted = sortPaletteSpecimens(input, "capacity");
    expect(sorted.map((s) => s.name)).toEqual(["ipsum", "observable10", "tableau10"]);
  });

  it("keeps the real registry alphabetical by default order", () => {
    const sorted = sortPaletteSpecimens(CATEGORICAL_PALETTES, "name");
    expect(sorted.map((s) => s.name)).toEqual(
      CATEGORICAL_PALETTES.map((p) => p.name).toSorted((a, b) => a.localeCompare(b)),
    );
  });
});

describe("resolveInitialScheme", () => {
  const specimens = [fake("observable10", 10), fake("tableau10", 10)];

  it("returns the requested scheme when it exists", () => {
    expect(resolveInitialScheme("tableau10", specimens)).toBe("tableau10");
  });

  it("returns null for missing or unknown schemes", () => {
    expect(resolveInitialScheme(null, specimens)).toBeNull();
    expect(resolveInitialScheme("not-a-scheme", specimens)).toBeNull();
  });
});

describe("COLORBLIND_SAFE_SCHEMES", () => {
  it("marks only the self-declared schemes", () => {
    expect(isColorblindSafe("colorblind")).toBe(true);
    expect(isColorblindSafe("tableau_colorblind")).toBe(true);
    expect(isColorblindSafe("pander")).toBe(true);
    expect(isColorblindSafe("observable10")).toBe(false);
  });

  it("references only schemes present in the docs picker list", () => {
    const names = new Set(CATEGORICAL_PALETTES.map((p) => p.name));
    for (const scheme of COLORBLIND_SAFE_SCHEMES) {
      expect(names.has(scheme), scheme).toBe(true);
    }
  });
});
