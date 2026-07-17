/**
 * Parameterized suite over all 12 declaration-only Geom* components.
 * Mounts each under GGPlot, asserts layer registration via the assembled
 * PortableSpec (toLayerInput path), and checks a representative param
 * forwards into layer.params.
 */
import { describe, expect, it } from "vitest";

import type { AesInput, GeomName } from "@ggsvelte/spec";

import type { PortableSpec } from "../../src/lib/index.js";
import GeomArea from "../../src/lib/geoms/GeomArea.svelte";
import GeomBar from "../../src/lib/geoms/GeomBar.svelte";
import GeomBoxplot from "../../src/lib/geoms/GeomBoxplot.svelte";
import GeomCol from "../../src/lib/geoms/GeomCol.svelte";
import GeomDensity from "../../src/lib/geoms/GeomDensity.svelte";
import GeomErrorbar from "../../src/lib/geoms/GeomErrorbar.svelte";
import GeomHistogram from "../../src/lib/geoms/GeomHistogram.svelte";
import GeomLine from "../../src/lib/geoms/GeomLine.svelte";
import GeomPoint from "../../src/lib/geoms/GeomPoint.svelte";
import GeomRule from "../../src/lib/geoms/GeomRule.svelte";
import GeomSmooth from "../../src/lib/geoms/GeomSmooth.svelte";
import GeomText from "../../src/lib/geoms/GeomText.svelte";
import SingleGeomPlot from "../fixtures/SingleGeomPlot.svelte";
import { render } from "../helpers/render.js";

type GeomCase = {
  readonly name: string;
  readonly Component: typeof GeomPoint;
  readonly geom: GeomName;
  /** After normalize(), histogram becomes bar — expect the wire geom name. */
  readonly assembledGeom?: string;
  readonly data: readonly Record<string, unknown>[];
  readonly aes: AesInput;
  readonly geomProps: Record<string, unknown>;
  readonly paramKey: string;
  readonly paramValue: unknown;
  /** DOM smoke: at least one mark/path/text should appear when registration works. */
  readonly markSelector: string;
};

const xy = [
  { x: 1, y: 10, label: "a" },
  { x: 2, y: 20, label: "b" },
  { x: 3, y: 15, label: "c" },
  { x: 4, y: 25, label: "d" },
];

const cat = [
  { cat: "a", v: 3 },
  { cat: "b", v: 5 },
  { cat: "a", v: 1 },
  { cat: "b", v: 7 },
];

const box = [
  { cat: "a", v: 1 },
  { cat: "a", v: 2 },
  { cat: "a", v: 3 },
  { cat: "b", v: 4 },
  { cat: "b", v: 6 },
  { cat: "b", v: 9 },
];

const err = [
  { x: "a", ymin: 1, ymax: 3 },
  { x: "b", ymin: 2, ymax: 5 },
];

const cases: readonly GeomCase[] = [
  {
    name: "GeomPoint",
    Component: GeomPoint,
    geom: "point",
    data: xy,
    aes: { x: "x", y: "y" },
    geomProps: { size: 5, alpha: 0.8 },
    paramKey: "size",
    paramValue: 5,
    markSelector: "circle",
  },
  {
    name: "GeomLine",
    Component: GeomLine,
    geom: "line",
    data: xy,
    aes: { x: "x", y: "y" },
    geomProps: { linewidth: 2, alpha: 0.9 },
    paramKey: "linewidth",
    paramValue: 2,
    markSelector: ".gg-paths path, path",
  },
  {
    name: "GeomCol",
    Component: GeomCol,
    geom: "col",
    data: cat,
    aes: { x: "cat", y: "v" },
    geomProps: { width: 0.7, alpha: 0.85 },
    paramKey: "width",
    paramValue: 0.7,
    markSelector: ".gg-rects rect, rect",
  },
  {
    name: "GeomBar",
    Component: GeomBar,
    geom: "bar",
    data: cat,
    aes: { x: "cat" },
    geomProps: { width: 0.6, alpha: 0.7 },
    paramKey: "width",
    paramValue: 0.6,
    markSelector: ".gg-rects rect, rect",
  },
  {
    name: "GeomArea",
    Component: GeomArea,
    geom: "area",
    data: xy,
    aes: { x: "x", y: "y" },
    geomProps: { alpha: 0.4 },
    paramKey: "alpha",
    paramValue: 0.4,
    markSelector: ".gg-areas path, path",
  },
  {
    name: "GeomRule",
    Component: GeomRule,
    geom: "rule",
    data: xy,
    aes: { x: "x", y: "y" },
    geomProps: { yintercept: 15, linewidth: 1.5 },
    paramKey: "yintercept",
    paramValue: 15,
    markSelector: ".gg-segments line, line",
  },
  {
    name: "GeomText",
    Component: GeomText,
    geom: "text",
    data: xy,
    aes: { x: "x", y: "y", label: "label" },
    geomProps: { size: 12, alpha: 0.95 },
    paramKey: "size",
    paramValue: 12,
    markSelector: "text",
  },
  {
    name: "GeomHistogram",
    Component: GeomHistogram,
    geom: "histogram",
    assembledGeom: "bar",
    data: xy,
    aes: { x: "x" },
    geomProps: { bins: 4, alpha: 0.6 },
    paramKey: "bins",
    paramValue: 4,
    markSelector: ".gg-rects rect, rect",
  },
  {
    name: "GeomSmooth",
    Component: GeomSmooth,
    geom: "smooth",
    data: xy,
    aes: { x: "x", y: "y" },
    geomProps: { method: "lm", level: 0.9, alpha: 0.3 },
    paramKey: "method",
    paramValue: "lm",
    markSelector: ".gg-areas path, .gg-paths path, path",
  },
  {
    name: "GeomBoxplot",
    Component: GeomBoxplot,
    geom: "boxplot",
    data: box,
    aes: { x: "cat", y: "v" },
    geomProps: { width: 0.5, alpha: 0.8 },
    paramKey: "width",
    paramValue: 0.5,
    markSelector: ".gg-rects rect, rect",
  },
  {
    name: "GeomDensity",
    Component: GeomDensity,
    geom: "density",
    data: xy,
    aes: { x: "x" },
    geomProps: { n: 64, alpha: 0.35 },
    paramKey: "n",
    paramValue: 64,
    markSelector: ".gg-areas path, path",
  },
  {
    name: "GeomErrorbar",
    Component: GeomErrorbar,
    geom: "errorbar",
    data: err,
    aes: { x: "x", ymin: "ymin", ymax: "ymax" },
    geomProps: { width: 0.2, linewidth: 1.2 },
    paramKey: "width",
    paramValue: 0.2,
    markSelector: ".gg-segments line, line",
  },
];

describe("Geom* declaration components (parameterized)", () => {
  it.each(cases)(
    "$name registers layer and forwards $paramKey into assembled layer params",
    (c) => {
      let assembled: PortableSpec | undefined;
      const { container } = render(SingleGeomPlot, {
        Geom: c.Component,
        geomProps: c.geomProps,
        data: c.data,
        aes: c.aes,
        onrender: (_model: unknown, spec: PortableSpec) => {
          assembled = spec;
        },
      });

      expect(assembled).toBeDefined();
      expect(assembled.layers).toHaveLength(1);
      const layer = assembled.layers[0];
      expect(layer.geom).toBe(c.assembledGeom ?? c.geom);
      expect(layer.params?.[c.paramKey]).toBe(c.paramValue);

      // Registration produced marks (not just a silent empty plot).
      expect(container.querySelector(c.markSelector)).not.toBeNull();
    },
  );
});
