import { describe, expect, test } from "bun:test";

import { EXAMPLES } from "../examples/manifest.js";
import {
  FEATURED_EXAMPLES,
  galleryCatalog,
  galleryEntryFor,
  type GalleryEntry,
} from "../apps/docs/src/lib/catalog/gallery.js";
import {
  filterGallery,
  parseGalleryFilter,
  rankRelatedExamples,
  serializeGalleryFilter,
} from "../apps/docs/src/lib/gallery-filter.js";

describe("gallery editorial catalog", () => {
  test("curates exactly six unique real examples in the approved order", () => {
    expect(FEATURED_EXAMPLES.map((entry) => entry.id)).toEqual([
      "line/multi-series",
      "smooth/loess-scatter",
      "point/scatter-color",
      "facet/wrap",
      "color/continuous",
      "point/canvas-scatter",
    ]);
    expect(new Set(FEATURED_EXAMPLES.map((entry) => entry.id)).size).toBe(6);
    const ids = new Set(EXAMPLES.map((entry) => entry.id));
    expect(FEATURED_EXAMPLES.every((entry) => ids.has(entry.id))).toBe(true);
    expect(FEATURED_EXAMPLES.every((entry) => entry.id.includes("/"))).toBe(true);
  });

  test("projects every gallery catalog entry without changing canonical identity", () => {
    const projected = galleryCatalog(EXAMPLES);
    expect(projected.length).toBe(EXAMPLES.length - 3);
    expect(projected.some((entry) => entry.id === "interaction/linked-views")).toBe(false);
    expect(projected.filter((entry) => entry.featured)).toHaveLength(6);
  });

  test("projects every manifest entry when asked explicitly", () => {
    const projected = EXAMPLES.map((entry) => galleryEntryFor(entry));
    expect(projected).toHaveLength(EXAMPLES.length);
    expect(projected.map((entry) => entry.id)).toEqual(EXAMPLES.map((entry) => entry.id));
  });
});

describe("gallery filter URL contract", () => {
  const entries = EXAMPLES.map((entry) => galleryEntryFor(entry));

  test("empty state returns all examples in manifest order", () => {
    expect(filterGallery(entries, { query: "", categories: [], tags: [] })).toEqual(entries);
  });

  test("searches manifest titles, descriptions, and tags", () => {
    const curated = filterGallery(entries, {
      query: "multi-series line",
      categories: [],
      tags: [],
    });
    expect(curated.some((entry) => entry.id === "line/multi-series")).toBe(true);
  });

  test("composes category, tag, and text with AND semantics", () => {
    const result = filterGallery(entries, {
      query: "legend",
      categories: ["bar"],
      tags: ["fill"],
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((entry) => entry.category === "bar" && entry.tags.includes("fill"))).toBe(
      true,
    );
  });

  test("round-trips deterministic gallery keys while preserving unrelated query params", () => {
    const available = {
      categories: new Set(entries.map((entry) => entry.category)),
      tags: new Set(entries.flatMap((entry) => [...entry.tags])),
    };
    const parsed = parseGalleryFilter(
      new URLSearchParams("theme=dark&q=  legend  &category=bar&category=bar&tag=fill&tag=nope"),
      available,
    );
    expect(parsed).toEqual({
      state: { query: "legend", categories: ["bar"], tags: ["fill"] },
      reset: true,
    });
    const serialized = serializeGalleryFilter(
      parsed.state,
      new URLSearchParams("theme=dark&vr=1&q=old&category=point"),
    );
    expect(serialized.toString()).toBe("theme=dark&vr=1&q=legend&category=bar&tag=fill");
  });
});

describe("related example ranking", () => {
  const entries: GalleryEntry[] = EXAMPLES.map((entry) => galleryEntryFor(entry));
  const catalog = galleryCatalog(EXAMPLES);

  test("excludes self, ranks overlap, uses manifest ties, and caps output", () => {
    const related = rankRelatedExamples("bar/stacked", entries, 3);
    expect(related).toHaveLength(3);
    expect(related.some((entry) => entry.id === "bar/stacked")).toBe(false);
    expect(related[0]?.category).toBe("bar");
  });

  test("falls back to manifest order when no tags overlap", () => {
    const synthetic: GalleryEntry[] = entries.map((entry, index) => ({
      ...entry,
      tags: [`unique-${String(index)}`],
    }));
    expect(
      rankRelatedExamples(synthetic.at(-1)!.id, synthetic, 2).map((entry) => entry.id),
    ).toEqual([synthetic[0]!.id, synthetic[1]!.id]);
  });

  test("without a seed, id outside the candidate catalog returns empty", () => {
    // Exposition aliases use galleryCatalog (excludes expositions) as candidates.
    expect(rankRelatedExamples("interaction/linked-views", catalog, 3)).toEqual([]);
  });

  test("with a seed outside the catalog, ranks gallery neighbours by category/tags", () => {
    // Old /examples/interaction/* alias pages still render the shared template;
    // their id is not in galleryCatalog, so ranking needs the manifest seed.
    const seed = EXAMPLES.find((entry) => entry.id === "interaction/linked-views");
    expect(seed).toBeDefined();
    const related = rankRelatedExamples(seed!.id, catalog, 3, seed);
    expect(related).toHaveLength(3);
    expect(related.every((entry) => entry.id !== seed!.id)).toBe(true);
    expect(related.every((entry) => catalog.some((c) => c.id === entry.id))).toBe(true);
    // Prefer remaining gallery interaction examples over unrelated families.
    expect(related[0]?.category).toBe("interaction");
  });
});
