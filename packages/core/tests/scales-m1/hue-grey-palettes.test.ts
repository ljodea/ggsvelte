/**
 * #829 hue/grey fixed palettes and HCL conversion.
 */
import { describe, expect, it } from "bun:test";

import {
  CATEGORICAL_SCHEMES,
  GREY_PALETTE_10,
  HUE_PALETTE_10,
  greyPalette,
  hclToHex,
  huePalette,
  trainColor,
} from "../../src/index.js";

describe("hue / grey palettes (#829)", () => {
  it("registers fixed 10-stop tables on CATEGORICAL_SCHEMES", () => {
    expect(CATEGORICAL_SCHEMES.hue).toBe(HUE_PALETTE_10);
    expect(CATEGORICAL_SCHEMES.grey).toBe(GREY_PALETTE_10);
    expect(CATEGORICAL_SCHEMES.gray).toBe(GREY_PALETTE_10);
    expect(HUE_PALETTE_10).toHaveLength(10);
    expect(GREY_PALETTE_10).toHaveLength(10);
  });

  it("produces distinct HCL hues and monotone greys", () => {
    expect(new Set(HUE_PALETTE_10).size).toBe(10);
    expect(GREY_PALETTE_10[0]).toBe("#333333");
    expect(GREY_PALETTE_10[9]).toBe("#cccccc");
    expect(hclToHex(15, 100, 65)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("trains ordinal hue without recolouring first-seen assignments", () => {
    const scale = trainColor(["a", "b", "c"], null, { scheme: "hue" });
    expect(scale.colorOf("a")).toBe(HUE_PALETTE_10[0]);
    expect(scale.colorOf("b")).toBe(HUE_PALETTE_10[1]);
    expect(scale.colorOf("c")).toBe(HUE_PALETTE_10[2]);
  });

  it("materialises custom-length palettes for explicit domain ranges", () => {
    expect(huePalette(3)).toHaveLength(3);
    expect(greyPalette(2, 0, 1)).toEqual(["#000000", "#ffffff"]);
  });
});
