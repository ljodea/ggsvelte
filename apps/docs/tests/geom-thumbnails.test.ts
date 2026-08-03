import { describe, expect, it } from "vitest";

import {
  GEOM_THUMBNAIL_EXAMPLE,
  illustrationForGeom,
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

  it("illustrationForGeom returns path + example id for every known geom", () => {
    expect(illustrationForGeom("point")).toEqual({
      path: "/previews/point-scatter-color-light.png",
      exampleId: "point/scatter-color",
    });
    expect(illustrationForGeom("histogram")).toEqual({
      path: "/previews/histogram-basic-light.png",
      exampleId: "histogram/basic",
    });
    for (const geom of Object.keys(GEOM_THUMBNAIL_EXAMPLE) as Array<
      keyof typeof GEOM_THUMBNAIL_EXAMPLE
    >) {
      const illustration = illustrationForGeom(geom);
      expect(illustration, geom).toBeDefined();
      expect(illustration?.exampleId).toBe(GEOM_THUMBNAIL_EXAMPLE[geom]);
      expect(illustration?.path).toBe(thumbnailPathForGeom(geom));
      expect(illustration?.path.endsWith("-light.png"), geom).toBe(true);
    }
  });
});
