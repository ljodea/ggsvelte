import { describe, expect, it } from "vitest";

import { pascalBodyToSlug, segmentReferenceLede } from "../src/lib/reference-lede";

const known = {
  geoms: new Set(["col", "bar", "density_2d_filled", "qq_line", "bin_2d"]),
  stats: new Set(["count", "bin"]),
};

describe("pascalBodyToSlug", () => {
  it("maps PascalCase bodies to catalog slugs", () => {
    expect(pascalBodyToSlug("Col")).toBe("col");
    expect(pascalBodyToSlug("Density2dFilled")).toBe("density_2d_filled");
    expect(pascalBodyToSlug("QqLine")).toBe("qq_line");
    expect(pascalBodyToSlug("Bin2d")).toBe("bin_2d");
  });
});

describe("segmentReferenceLede", () => {
  it("links GeomCol and GeomBar in the bar/col cross-references", () => {
    const bar =
      "Do not map aes.y — the stat computes it. Prefer GeomCol when bar heights are already in the data.";
    const segs = segmentReferenceLede(bar, known);
    expect(segs).toEqual([
      {
        kind: "text",
        value: "Do not map aes.y — the stat computes it. Prefer ",
      },
      { kind: "link", label: "GeomCol", href: "/reference/geoms/col" },
      {
        kind: "text",
        value: " when bar heights are already in the data.",
      },
    ]);
  });

  it("links GeomBar from the col lede", () => {
    const col =
      "Use when the data already contains the bar heights — prefer over GeomBar, which counts or bins.";
    const segs = segmentReferenceLede(col, known);
    const link = segs.find((s) => s.kind === "link");
    expect(link).toEqual({
      kind: "link",
      label: "GeomBar",
      href: "/reference/geoms/bar",
    });
  });

  it("leaves unknown Geom tokens as text", () => {
    const segs = segmentReferenceLede("See GeomNoSuch for details.", known);
    expect(segs).toEqual([{ kind: "text", value: "See GeomNoSuch for details." }]);
  });

  it("returns a single text segment when there are no tokens", () => {
    expect(segmentReferenceLede("Point marks at (x, y).", known)).toEqual([
      { kind: "text", value: "Point marks at (x, y)." },
    ]);
  });
});
