import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { EXAMPLES } from "../examples/manifest.js";
import {
  emptyProvenance,
  provenanceEntryFor,
  upsertProvenanceEntry,
  writeProvenance,
} from "./gallery-preview-provenance.js";
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
    expect(new Set(previewSourceInventory(EXAMPLES).map((entry) => entry.filename)).size).toBe(
      EXAMPLES.length,
    );
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

  test("check fails when example sources drift even if PNG + projection stay consistent (#746)", async () => {
    const root = mkdtempSync(join(tmpdir(), "ggsvelte-gallery-stale-src-"));
    const examplesRoot = join(root, "examples");
    const previews = join(root, "previews");
    const projection = join(root, "gallery-previews.ts");
    mkdirSync(previews, { recursive: true });
    const sample = [EXAMPLES[0]!, EXAMPLES[1]!];
    try {
      let provenance = emptyProvenance();
      for (const entry of sample) {
        const dir = join(examplesRoot, ...entry.id.split("/"));
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "Example.svelte"), `example:${entry.id}`);
        writeFileSync(join(dir, "spec.ts"), `spec:${entry.id}`);
        writeFileSync(join(dir, "meta.json"), "{}");
        writeFileSync(join(previews, canonicalPreviewFilename(entry.id)), `png:${entry.id}`);
        provenance = upsertProvenanceEntry(
          provenance,
          entry.id,
          provenanceEntryFor(examplesRoot, previews, entry.id),
        );
      }
      writeProvenance(join(previews, "provenance.json"), provenance);
      await generateGalleryPreviews({
        entries: sample,
        source: previews,
        output: previews,
        projection,
        examplesRoot,
      });
      // Fresh provenance + projection: green
      await generateGalleryPreviews({
        entries: sample,
        source: previews,
        output: previews,
        projection,
        examplesRoot,
        check: true,
      });
      // Mutate source without recapture — PNG bytes unchanged, projection still matches
      writeFileSync(
        join(examplesRoot, ...sample[0]!.id.split("/"), "Example.svelte"),
        "mutated without recapture",
      );
      let staleError: unknown;
      try {
        await generateGalleryPreviews({
          entries: sample,
          source: previews,
          output: previews,
          projection,
          examplesRoot,
          check: true,
        });
      } catch (error) {
        staleError = error;
      }
      expect(staleError).toBeInstanceOf(Error);
      if (!(staleError instanceof Error)) throw new Error("expected check to fail");
      expect(staleError.message).toContain(sample[0]!.id);
      expect(staleError.message).toContain("source files changed");
      // gen alone must not rewrite provenance and silence the gate
      await generateGalleryPreviews({
        entries: sample,
        source: previews,
        output: previews,
        projection,
        examplesRoot,
      });
      let stillStale: unknown;
      try {
        await generateGalleryPreviews({
          entries: sample,
          source: previews,
          output: previews,
          projection,
          examplesRoot,
          check: true,
        });
      } catch (error) {
        stillStale = error;
      }
      expect(stillStale).toBeInstanceOf(Error);
      if (!(stillStale instanceof Error)) throw new Error("expected check still fail");
      expect(stillStale.message).toContain(sample[0]!.id);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("gen write prunes orphan provenance for deleted examples without restamping digests", async () => {
    const root = mkdtempSync(join(tmpdir(), "ggsvelte-gallery-prune-"));
    const examplesRoot = join(root, "examples");
    const previews = join(root, "previews");
    const projection = join(root, "gallery-previews.ts");
    mkdirSync(previews, { recursive: true });
    const keep = EXAMPLES[0]!;
    const gone = EXAMPLES[1]!;
    try {
      for (const entry of [keep, gone]) {
        const dir = join(examplesRoot, ...entry.id.split("/"));
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "Example.svelte"), entry.id);
        writeFileSync(join(dir, "spec.ts"), entry.id);
        writeFileSync(join(dir, "meta.json"), "{}");
        writeFileSync(join(previews, canonicalPreviewFilename(entry.id)), `png:${entry.id}`);
      }
      let provenance = emptyProvenance();
      for (const entry of [keep, gone]) {
        provenance = upsertProvenanceEntry(
          provenance,
          entry.id,
          provenanceEntryFor(examplesRoot, previews, entry.id),
        );
      }
      writeProvenance(join(previews, "provenance.json"), provenance);
      const keepDigest = provenance.entries[keep.id]!.sourceSha256;
      await generateGalleryPreviews({
        entries: [keep],
        source: previews,
        output: previews,
        projection,
        examplesRoot,
      });
      const after = JSON.parse(readFileSync(join(previews, "provenance.json"), "utf8")) as {
        entries: Record<string, { sourceSha256: string }>;
      };
      expect(after.entries[gone.id]).toBeUndefined();
      expect(after.entries[keep.id]?.sourceSha256).toBe(keepDigest);
      await generateGalleryPreviews({
        entries: [keep],
        source: previews,
        output: previews,
        projection,
        examplesRoot,
        check: true,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("checked repository projection, assets, and provenance are current", async () => {
    await generateGalleryPreviews({ check: true });
  });
});
