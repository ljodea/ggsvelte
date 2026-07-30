import { describe, expect, it } from "bun:test";

import { buildDocsCrumbs } from "./docs-breadcrumbs.ts";

describe("buildDocsCrumbs", () => {
  it("guide pages stay Docs / title", () => {
    expect(buildDocsCrumbs("/guide/getting-started", "Getting started", false)).toEqual([
      { label: "Docs", href: "/docs" },
      { label: "Getting started" },
    ]);
  });

  it("reference root is a single crumb", () => {
    expect(buildDocsCrumbs("/reference", "Reference", true)).toEqual([{ label: "Reference" }]);
  });

  it("reference section index is Reference / Section", () => {
    expect(buildDocsCrumbs("/reference/scales", "Scales", true)).toEqual([
      { label: "Reference", href: "/reference" },
      { label: "Scales" },
    ]);
    expect(buildDocsCrumbs("/reference/geoms", "Geoms", true)).toEqual([
      { label: "Reference", href: "/reference" },
      { label: "Geoms" },
    ]);
  });

  it("scale detail pages include Scales in the trail", () => {
    expect(buildDocsCrumbs("/reference/scales/y_log10", "ScaleYLog10", true)).toEqual([
      { label: "Reference", href: "/reference" },
      { label: "Scales", href: "/reference/scales" },
      { label: "ScaleYLog10" },
    ]);
    expect(buildDocsCrumbs("/reference/scales/fill_distiller", "ScaleFillDistiller", true)).toEqual(
      [
        { label: "Reference", href: "/reference" },
        { label: "Scales", href: "/reference/scales" },
        { label: "ScaleFillDistiller" },
      ],
    );
  });

  it("other reference detail sections keep the middle section crumb", () => {
    expect(buildDocsCrumbs("/reference/geoms/col", "GeomCol", true)).toEqual([
      { label: "Reference", href: "/reference" },
      { label: "Geoms", href: "/reference/geoms" },
      { label: "GeomCol" },
    ]);
    expect(buildDocsCrumbs("/reference/guides/legend", "GuideLegend", true)).toEqual([
      { label: "Reference", href: "/reference" },
      { label: "Guides", href: "/reference/guides" },
      { label: "GuideLegend" },
    ]);
  });
});
