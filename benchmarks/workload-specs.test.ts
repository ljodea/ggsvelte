import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import * as specs from "./workload-specs";
import {
  coordFixedSpec,
  coordPointSpec,
  coordTessellationSpec,
  densitySpec,
  facetedBarsSpec,
  histogramSpec,
  lineSeriesSpec,
  loessSpec,
  mappedStyleSpec,
  maxBoundaryBinnedSpec,
  nonPositionColorSpec,
  responsiveGuideSpec,
  scatterSpec,
  stackedBarSpec,
  temporalFreeFacetSpec,
  temporalLineSpec,
  transformedFacetSpec,
  transformedScatterSpec,
  transformedStatsSpec,
} from "./workload-specs";

/** Small-n PortableSpec snapshots — guards the factories extracted from the registry. */
const goldenPath = fileURLToPath(new URL("./workload-specs.golden.json", import.meta.url));
const golden = JSON.parse(readFileSync(goldenPath, "utf8")) as Record<string, unknown>;

describe("workload-specs factories", () => {
  const actual = {
    temporalLineSpec: temporalLineSpec(8),
    temporalFreeFacetSpec: temporalFreeFacetSpec(3),
    scatterSpec: scatterSpec(8),
    scatterSpecCanvas: scatterSpec(8, "canvas"),
    transformedScatterIdentity: transformedScatterSpec(8, "identity"),
    transformedScatterLog10: transformedScatterSpec(8, "log10"),
    transformedScatterSqrt: transformedScatterSpec(8, "sqrt"),
    transformedStatsSmooth: transformedStatsSpec(8, "smooth"),
    transformedStatsBin: transformedStatsSpec(8, "bin"),
    transformedFacetSpec: transformedFacetSpec(12, 3),
    coordPointIdentity: coordPointSpec(8, "identity"),
    coordPointLog10: coordPointSpec(8, "log10"),
    coordFixedSpec: coordFixedSpec(8),
    coordTessellationSpec: coordTessellationSpec(6),
    maxBoundaryBinnedSpec: maxBoundaryBinnedSpec(8),
    nonPositionColorLog10: nonPositionColorSpec(8, "log10"),
    nonPositionColorBinned: nonPositionColorSpec(8, "binned"),
    nonPositionColorManual: nonPositionColorSpec(8, "manual"),
    responsiveGuideSpec: responsiveGuideSpec(8),
    mappedStyleSpec: mappedStyleSpec(8),
    // Unparameterised factories still snapshot full fixture size (2000 / 200 rows).
    facetedBarsSpec: facetedBarsSpec(),
    stackedBarSpec: stackedBarSpec(),
    lineSeriesSpec: lineSeriesSpec(5),
    histogramSpec: histogramSpec(8),
    loessSpec: loessSpec(12),
    densitySpec: densitySpec(8),
  } as const;

  it("covers every exported factory at least once", () => {
    const exported = Object.keys(specs).toSorted();
    const covered = new Set<string>([
      "temporalLineSpec",
      "temporalFreeFacetSpec",
      "scatterSpec",
      "transformedScatterSpec",
      "transformedStatsSpec",
      "transformedFacetSpec",
      "coordPointSpec",
      "coordFixedSpec",
      "coordTessellationSpec",
      "maxBoundaryBinnedSpec",
      "nonPositionColorSpec",
      "responsiveGuideSpec",
      "mappedStyleSpec",
      "facetedBarsSpec",
      "stackedBarSpec",
      "lineSeriesSpec",
      "histogramSpec",
      "loessSpec",
      "densitySpec",
    ]);
    expect(exported).toEqual([...covered].toSorted());
  });

  it("matches the frozen small-n golden for every factory case", () => {
    expect(Object.keys(actual).toSorted()).toEqual(Object.keys(golden).toSorted());
    // JSON equality keeps the golden fixture untyped while catching seed,
    // geom option, scale, facet, and coord drift in the extracted factories.
    expect(JSON.parse(JSON.stringify(actual))).toEqual(golden);
  });

  it("keeps canvas render on the optional scatter path only", () => {
    expect(JSON.stringify(actual.scatterSpec)).not.toContain('"render":"canvas"');
    expect(JSON.stringify(actual.scatterSpecCanvas)).toContain('"render":"canvas"');
  });
});
