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

/**
 * Every gallery light is a capture of that example's own `?vr` frame
 * (#652/#668), so its pixel size must be the frame geometry the manifest
 * declares. Five previews had drifted off it — 641×441, 800×760, 640×480,
 * 640×401, 640×360 — because they were captured ad hoc rather than by the
 * capture script, and drifted geometry is a reliable tell that a preview no
 * longer shows the example behind it (#656). Checking the whole corpus rather
 * than the interaction subset is what makes that fail loudly.
 */
describe("gallery lights match VR frame geometry (#652/#668)", () => {
  it("covers the whole example corpus", () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(44);
  });

  for (const entry of EXAMPLES) {
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
