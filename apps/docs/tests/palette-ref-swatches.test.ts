import { describe, expect, it } from "vitest";

import {
  CATEGORICAL_SCHEME_REFS,
  SEQUENTIAL_SCHEME_REFS,
} from "../src/lib/catalog/palette-reference";
import {
  categoricalSwatchFor,
  chooserSchemeFor,
  sequentialSwatchFor,
} from "../src/lib/catalog/palette-ref-swatches";

describe("categoricalSwatchFor", () => {
  it("returns hex colors for known schemes", () => {
    const swatch = categoricalSwatchFor("observable10");
    expect(swatch).not.toBeNull();
    expect(swatch![0]).toBe("#4269d0");
    for (const color of swatch!) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("returns null for unknown schemes", () => {
    expect(categoricalSwatchFor("not-a-scheme")).toBeNull();
  });

  it("covers every categorical reference entry", () => {
    for (const entry of CATEGORICAL_SCHEME_REFS) {
      expect(categoricalSwatchFor(entry.name), entry.name).not.toBeNull();
    }
  });
});

describe("sequentialSwatchFor", () => {
  it("returns ramps across all three resolution sources", () => {
    expect(sequentialSwatchFor("viridis")?.[0]).toBe("#440154");
    expect(sequentialSwatchFor("Blues")).not.toBeNull();
    expect(sequentialSwatchFor("tableau_seq_blue")).not.toBeNull();
  });

  it("returns null for unknown schemes", () => {
    expect(sequentialSwatchFor("not-a-scheme")).toBeNull();
  });

  it("covers every sequential reference entry", () => {
    for (const entry of SEQUENTIAL_SCHEME_REFS) {
      expect(sequentialSwatchFor(entry.name), entry.name).not.toBeNull();
    }
  });
});

describe("chooserSchemeFor", () => {
  it("deep-links picker schemes and skips display aliases", () => {
    expect(chooserSchemeFor("observable10")).toBe("observable10");
    expect(chooserSchemeFor("gray")).toBeNull();
  });
});
