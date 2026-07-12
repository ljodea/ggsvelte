/**
 * Node smoke test for the PURE entry (no DOM globals) + renderToSVGString
 * determinism, including the M0c equivalence gate: one PortableSpec + fixed
 * RunOptions (canonical metrics measurer) -> byte-identical SVG across two
 * runs and across builder-vs-spec inputs.
 */
import { describe, expect, it } from "bun:test";

import { aes, gg, normalize } from "@ggsvelte/spec";

import { PipelineError } from "../src/pipeline.ts";
import { renderToSVGString } from "../src/render-svg.ts";

const rows = [
  { x: 1, y: 10, cls: "a" },
  { x: 2, y: 20, cls: "b" },
  { x: 3, y: 15, cls: "a" },
  { x: 4, y: 25, cls: "b" },
];

describe("pure entry (Node smoke)", () => {
  it("imports and renders with no DOM globals", async () => {
    expect(typeof globalThis.document).toBe("undefined");
    expect(typeof globalThis.window).toBe("undefined");
    const entry = await import("../src/index.ts");
    const svg = entry.renderToSVGString(
      gg(rows, aes({ x: "x", y: "y", color: "cls" }))
        .geomPoint({ alpha: 0.8 })
        .geomLine(),
      { width: 640, height: 400 },
    );
    expect(svg.startsWith("<svg ")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title>");
    expect(svg).toContain("<circle");
    expect(svg).toContain("<path d=");
    expect(svg).toContain("gg-axis-x");
    expect(svg).toContain("currentColor");
    expect(svg).toContain("--gg-grid");
  });
});

describe("renderToSVGString — determinism + equivalence (M0c gate)", () => {
  const builder = gg(rows, aes({ x: "x", y: "y", color: "cls" }))
    .geomPoint({ size: 3 })
    .labs({ title: "Fuel", x: "X", y: "Y" });

  it("byte-identical across two runs", () => {
    const a = renderToSVGString(builder, { width: 640, height: 400 });
    const b = renderToSVGString(builder, { width: 640, height: 400 });
    expect(a).toBe(b);
  });

  it("byte-identical across builder vs hand-written PortableSpec inputs", () => {
    const viaBuilder = renderToSVGString(builder, { width: 640, height: 400 });
    const handWritten = normalize({
      data: { values: rows },
      aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "cls" } },
      layers: [{ geom: "point", params: { size: 3 } }],
      labs: { title: "Fuel", x: "X", y: "Y" },
    });
    const viaSpec = renderToSVGString(handWritten, { width: 640, height: 400 });
    expect(viaSpec).toBe(viaBuilder);
  });

  it("escapes markup in labels", () => {
    const svg = renderToSVGString(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .labs({ title: 'A <b>&"title"' }),
      { width: 400, height: 300 },
    );
    expect(svg).toContain("A &lt;b&gt;&amp;&quot;title&quot;");
    expect(svg).not.toContain("<b>");
  });

  it("step curves bend at midpoints", () => {
    const svg = renderToSVGString(
      gg(
        [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        aes({ x: "x", y: "y" }),
      ).geomLine({
        curve: "step",
      }),
      { width: 400, height: 300 },
    );
    const d = /<path d="([^"]+)"/.exec(svg)?.[1] ?? "";
    // M, then two step Ls, then the final L: 4 commands minimum
    expect(d.split("L").length).toBe(4);
  });

  it("enforces maxMarks", () => {
    expect(() =>
      renderToSVGString(gg(rows, aes({ x: "x", y: "y" })).geomPoint(), {
        width: 640,
        height: 400,
        maxMarks: 3,
      }),
    ).toThrow(PipelineError);
  });
});
