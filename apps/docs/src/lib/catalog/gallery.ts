import type { ExampleManifestEntry } from "../../../../../examples/manifest.js";
import { GALLERY_PREVIEWS } from "../generated/gallery-previews.js";
import { isInteractionExposition } from "./interaction-exposition.js";

export interface GalleryEntry extends ExampleManifestEntry {
  previewPath: string;
  featured: boolean;
}

/** Featured strip order on home and gallery. Identity only — titles come from the manifest. */
export const FEATURED_EXAMPLES = [
  { id: "line/multi-series" },
  { id: "smooth/loess-scatter" },
  { id: "density/kde-2d-filled" },
  { id: "density/overlay" },
  { id: "path/ellipse-rings" },
  { id: "color/binned" },
] as const;

const featuredIds = new Set<string>(FEATURED_EXAMPLES.map((entry) => entry.id));

const previewById = new Map<string, string>(
  GALLERY_PREVIEWS.map((preview) => [preview.id, preview.path]),
);

/** Resolved static preview path for an example id (including interaction demos). */
export function previewPathFor(id: string): string {
  const previewPath = previewById.get(id);
  if (previewPath === undefined) throw new Error(`Missing generated preview for ${id}`);
  return previewPath;
}

export function galleryEntryFor(entry: ExampleManifestEntry): GalleryEntry {
  return {
    ...entry,
    previewPath: previewPathFor(entry.id),
    featured: featuredIds.has(entry.id),
  };
}

/** Manifest entries that belong on the public gallery (not interaction expositions). */
export function galleryCatalog(examples: readonly ExampleManifestEntry[]): GalleryEntry[] {
  const catalog: GalleryEntry[] = [];
  for (const entry of examples) {
    if (isInteractionExposition(entry.id)) continue;
    catalog.push(galleryEntryFor(entry));
  }
  return catalog;
}
