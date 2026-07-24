import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

import { EXAMPLES } from "../examples/manifest.js";
import { canonicalPreviewFilename } from "./gen-gallery-previews.js";

const ROOT = join(import.meta.dir, "..");
const PREVIEWS = join(ROOT, "apps", "docs", "static", "previews");

/** Minimal PNG IHDR width/height reader (big-endian). */
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  if (buf.toString("ascii", 1, 4) !== "PNG") throw new Error(`not a PNG: ${path}`);
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

describe("interaction gallery lights match VR frame geometry (#652/#668)", () => {
  const interaction = EXAMPLES.filter((entry) => entry.id.startsWith("interaction/"));

  it("covers every interaction example", () => {
    expect(interaction.length).toBeGreaterThanOrEqual(6);
  });

  for (const entry of interaction) {
    const filename = canonicalPreviewFilename(entry.id);
    const path = join(PREVIEWS, filename);
    const expectedWidth = entry.vrWidth ?? 640;
    const expectedHeight = entry.vrHeight ?? 400;

    it(`${filename} exists at ${String(expectedWidth)}×${String(expectedHeight)}`, () => {
      expect(existsSync(path)).toBe(true);
      const { width, height } = pngSize(path);
      expect(width).toBe(expectedWidth);
      expect(height).toBe(expectedHeight);
    });
  }
});
