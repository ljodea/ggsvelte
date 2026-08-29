import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { GGPlot, GeomPoint } from "../src/index.js";

const rows = [
  { x: 1, y: 10 },
  { x: 2, y: 20 },
];

describe("SSR children-first registration", () => {
  it("renderToString of a children plot produces a plot root", () => {
    const html = renderToString(
      createElement(
        GGPlot,
        { data: rows, aes: { x: "x", y: "y" }, width: 480, height: 320 },
        createElement(GeomPoint, null),
      ),
    );
    expect(html).toContain("gg-plot-root");
  });
});
