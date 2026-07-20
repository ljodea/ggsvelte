import type { ExampleManifestEntry } from "../../../../../examples/manifest.js";
import { GALLERY_PREVIEWS } from "../generated/gallery-previews.js";

export interface FeaturedExample {
  id: string;
  jobTitle: string;
  proof: string;
  note: string;
}

export interface GalleryEntry extends ExampleManifestEntry {
  previewPath: string;
  featured?: FeaturedExample;
}

export const FEATURED_EXAMPLES = [
  {
    id: "line/multi-series",
    jobTitle: "Track several series over time",
    proof: "Layered lines, stable color identity, and a clear legend for an application staple.",
    note: "Multiple series · stable color",
  },
  {
    id: "smooth/loess-scatter",
    jobTitle: "Explain a noisy relationship",
    proof: "Raw observations, a statistical smoother, and its confidence ribbon share one view.",
    note: "Points · smooth · confidence ribbon",
  },
  {
    id: "interaction/linked-views",
    jobTitle: "Coordinate a chart with ordinary UI",
    proof: "Semantic keys connect plots, controls, and an accessible table without callback loops.",
    note: "Interactive · linked selection",
  },
  {
    id: "facet/wrap",
    jobTitle: "Compare distributions across groups",
    proof: "Small multiples turn one specification into a repeated, readable comparison.",
    note: "Facets · per-panel statistics",
  },
  {
    id: "color/continuous",
    jobTitle: "Map magnitude with ordered color",
    proof:
      "A perceptually ordered scale carries quantitative meaning without changing the data model.",
    note: "Sequential color · continuous data",
  },
  {
    id: "point/canvas-scatter",
    jobTitle: "Render dense data responsibly",
    proof: "Canvas marks keep SVG axes and an accessible chart surface for a 10,000-point view.",
    note: "10k points · canvas marks · SVG chrome",
  },
] as const satisfies readonly FeaturedExample[];

const featuredById = new Map<string, FeaturedExample>(
  FEATURED_EXAMPLES.map((entry) => [entry.id, entry]),
);

const previewById = new Map<string, string>(
  GALLERY_PREVIEWS.map((preview) => [preview.id, preview.path]),
);

export function galleryEntryFor(entry: ExampleManifestEntry): GalleryEntry {
  const featured = featuredById.get(entry.id);
  const previewPath = previewById.get(entry.id);
  if (previewPath === undefined) throw new Error(`Missing generated preview for ${entry.id}`);
  return { ...entry, previewPath, ...(featured !== undefined && { featured }) };
}
