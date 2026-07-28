import { describe, expect, it } from "vitest";

import {
  GEOM_THUMBNAIL_EXAMPLE,
  missingGeomThumbnails,
  thumbnailPathForGeom,
} from "../src/lib/geom-thumbnails";
import { GALLERY_PREVIEWS } from "../src/lib/generated/gallery-previews";

describe("GEOM_THUMBNAIL_EXAMPLE", () => {
  it("covers every known geom with a real gallery preview", () => {
    expect(missingGeomThumbnails()).toEqual([]);
  });

  it("resolves point and bar to known preview paths", () => {
    expect(thumbnailPathForGeom("point")).toBe("/previews/point-scatter-color-light.png");
    expect(thumbnailPathForGeom("bar")).toBe("/previews/bar-dodged-light.png");
  });

  it("only references ids present in GALLERY_PREVIEWS", () => {
    const ids = new Set(GALLERY_PREVIEWS.map((p) => p.id));
    for (const [geom, exampleId] of Object.entries(GEOM_THUMBNAIL_EXAMPLE)) {
      expect(ids.has(exampleId), `${geom} → ${exampleId}`).toBe(true);
    }
  });
});
