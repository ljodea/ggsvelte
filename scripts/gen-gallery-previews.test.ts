import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { EXAMPLES } from "../examples/manifest.js";
import {
  canonicalPreviewFilename,
  generateGalleryPreviews,
  previewSourceInventory,
} from "./gen-gallery-previews.js";

describe("generated gallery previews", () => {
  test("maps the closed manifest set and ignores unrelated light screenshots", () => {
    expect(canonicalPreviewFilename("interaction/linked-views")).toBe(
      "interaction-linked-views-light.png",
    );
    expect(previewSourceInventory(EXAMPLES)).toHaveLength(EXAMPLES.length);
    expect(new Set(previewSourceInventory(EXAMPLES).map((entry) => entry.filename)).size).toBe(34);
    expect(
      previewSourceInventory(EXAMPLES).some((entry) => entry.filename.startsWith("docs-guide")),
    ).toBe(false);
  });

  test("materializes exact bytes and rejects a missing canonical source", async () => {
    const root = mkdtempSync(join(tmpdir(), "ggsvelte-gallery-previews-"));
    const source = join(root, "source");
    const output = join(root, "output");
    const projection = join(root, "gallery-previews.ts");
    mkdirSync(source, { recursive: true });
    const sample = [EXAMPLES[0]!, EXAMPLES[1]!];
    for (const entry of sample) {
      writeFileSync(join(source, canonicalPreviewFilename(entry.id)), `png:${entry.id}`);
    }
    writeFileSync(join(source, "docs-guide-1280-light.png"), "ignored");

    try {
      await generateGalleryPreviews({ entries: sample, source, output, projection });
      expect(readFileSync(join(output, canonicalPreviewFilename(sample[0]!.id)), "utf8")).toBe(
        `png:${sample[0]!.id}`,
      );
      expect(readFileSync(projection, "utf8")).toContain(sample[1]!.id);
      rmSync(join(source, canonicalPreviewFilename(sample[1]!.id)));
      let missingError: unknown;
      try {
        await generateGalleryPreviews({ entries: sample, source, output, projection });
      } catch (error) {
        missingError = error;
      }
      expect(missingError).toBeInstanceOf(Error);
      if (!(missingError instanceof Error)) throw new Error("Expected generation to fail");
      expect(missingError.message).toContain(canonicalPreviewFilename(sample[1]!.id));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("checked repository projection and assets are current", async () => {
    await generateGalleryPreviews({ check: true });
  });
});
