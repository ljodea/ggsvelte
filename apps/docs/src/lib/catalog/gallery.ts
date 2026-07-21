import type { ExampleManifestEntry } from "../../../../../examples/manifest.js";
import { GALLERY_PREVIEWS } from "../generated/gallery-previews.js";

export interface GalleryEntry extends ExampleManifestEntry {
  previewPath: string;
  featured: boolean;
}

/** Featured strip order on home and gallery. Identity only — titles come from the manifest. */
export const FEATURED_EXAMPLES = [
  { id: "line/multi-series" },
  { id: "smooth/loess-scatter" },
  { id: "interaction/linked-views" },
  { id: "facet/wrap" },
  { id: "color/continuous" },
  { id: "point/canvas-scatter" },
] as const;

const featuredIds = new Set<string>(FEATURED_EXAMPLES.map((entry) => entry.id));

const previewById = new Map<string, string>(
  GALLERY_PREVIEWS.map((preview) => [preview.id, preview.path]),
);

export function galleryEntryFor(entry: ExampleManifestEntry): GalleryEntry {
  const previewPath = previewById.get(entry.id);
  if (previewPath === undefined) throw new Error(`Missing generated preview for ${entry.id}`);
  return { ...entry, previewPath, featured: featuredIds.has(entry.id) };
}
