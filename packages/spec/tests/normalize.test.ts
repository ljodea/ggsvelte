import { describe, expect, it } from "bun:test";

import { normalize, normalizeChannel } from "../src/normalize.ts";
import type { SpecInput } from "../src/normalize.ts";
import { validate } from "../src/validate.ts";

describe("normalizeChannel", () => {
  it("canonicalizes bare strings to { field }", () => {
    expect(normalizeChannel("displ")).toEqual({ field: "displ" });
  });

  it("passes canonical forms through (cloned, canonical key order)", () => {
    expect(normalizeChannel({ field: "hwy" })).toEqual({ field: "hwy" });
    expect(normalizeChannel({ value: "steelblue" })).toEqual({ value: "steelblue" });
    expect(normalizeChannel({ value: "a", scale: true })).toEqual({ value: "a", scale: true });
    expect(normalizeChannel({ stat: "count" })).toEqual({ stat: "count" });
    expect(normalizeChannel(null)).toBeNull();
  });
});

describe("normalize", () => {
  const input: SpecInput = {
    data: { values: [{ x: 1, y: 2, cls: "a" }] },
    aes: { x: "x", y: "y", color: "cls" },
    layers: [{ geom: "point" }],
  };

  it("fills geom defaults (stat/position identity) and resolves inheritance", () => {
    const spec = normalize(input);
    expect(spec.layers).toEqual([
      {
        geom: "point",
        stat: "identity",
        position: "identity",
        aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "cls" } },
      },
    ]);
    // plot-level aes is resolved INTO layers and removed (canonical form)
    expect(spec.aes).toBeUndefined();
  });

  it("layer aes overrides inherited channels; null unsets them", () => {
    const spec = normalize({
      ...input,
      layers: [
        { geom: "line", aes: { color: null, y: "y2" } },
        { geom: "point", aes: { color: { value: "black" } } },
      ],
    });
    expect(spec.layers[0]).toEqual({
      geom: "line",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "x" }, y: { field: "y2" } },
    });
    expect(spec.layers[1]).toEqual({
      geom: "point",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "x" }, y: { field: "y" }, color: { value: "black" } },
    });
  });

  it("is idempotent (normalize ∘ normalize = normalize)", () => {
    const once = normalize({
      ...input,
      layers: [{ geom: "point", aes: { color: null } }],
    });
    expect(normalize(once as SpecInput)).toEqual(once);
  });

  it("emits a valid PortableSpec", () => {
    const result = validate(normalize(input));
    expect(result.ok).toBe(true);
  });

  it("fills M1 geom defaults: bar -> count+stack (+ y stat mapping), col/area -> identity+stack", () => {
    const spec = normalize({
      data: { values: [{ x: "a", y: 2, cls: "u" }] },
      aes: { x: "x", fill: "cls" },
      layers: [
        { geom: "bar" },
        { geom: "col", aes: { y: "y" } },
        { geom: "area", aes: { y: "y" } },
        { geom: "rule" },
        { geom: "text", aes: { y: "y", label: "cls" } },
      ],
    });
    expect(spec.layers[0]).toEqual({
      geom: "bar",
      stat: "count",
      position: "stack",
      aes: { x: { field: "x" }, y: { stat: "count" }, fill: { field: "cls" } },
    });
    expect(spec.layers[1]).toMatchObject({ geom: "col", stat: "identity", position: "stack" });
    expect(spec.layers[2]).toMatchObject({ geom: "area", stat: "identity", position: "stack" });
    expect(spec.layers[3]).toMatchObject({ geom: "rule", stat: "identity", position: "identity" });
    expect(spec.layers[4]).toMatchObject({ geom: "text", stat: "identity", position: "identity" });
  });

  it("bar keeps an explicit y mapping (validation rejects it later); idempotent stat-y fill", () => {
    const explicit = normalize({
      layers: [{ geom: "bar", aes: { x: "x", y: { stat: "count" } } }],
    });
    expect(explicit.layers[0]).toMatchObject({ aes: { y: { stat: "count" } } });
    expect(normalize(explicit as SpecInput)).toEqual(explicit);
  });

  it("preserves scales, legend, and theme objects (cloned)", () => {
    const spec = normalize({
      layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
      scales: { y: { type: "log", zero: false }, color: { scheme: "viridis" } },
      legend: { order: "sorted" },
      theme: { name: "dark", accent: "#ff0000" },
    });
    // `type: "log"` canonicalizes to the linear family + log10 transform (PR 3);
    // other scale options survive the rewrite unchanged.
    expect(spec.scales).toEqual({
      y: { type: "linear", transform: "log10", zero: false },
      color: { scheme: "viridis" },
    });
    expect(spec.legend).toEqual({ order: "sorted" });
    expect(spec.theme).toEqual({ name: "dark", accent: "#ff0000" });
    expect(normalize(spec as SpecInput)).toEqual(spec);
  });

  it("normalizes three-digit custom color stops to canonical lowercase hex", () => {
    const spec = normalize({
      layers: [{ geom: "point" }],
      scales: {
        color: { type: "sequential", range: ["#ABC", "#123456"] },
        fill: { type: "ordinal", range: ["#F0A"] },
      },
    });

    expect(spec.scales).toEqual({
      color: { type: "sequential", range: ["#aabbcc", "#123456"] },
      fill: { type: "ordinal", range: ["#ff00aa"] },
    });
    expect(normalize(spec as SpecInput)).toEqual(spec);
  });

  it("leaves a malformed non-array range for validation instead of throwing", () => {
    const malformed = {
      layers: [{ geom: "point" }],
      scales: { color: { range: "#f00" } },
    } as unknown as SpecInput;

    expect(() => normalize(malformed)).not.toThrow();
    expect(normalize(malformed).scales?.color?.range).toBe("#f00");
  });

  it("preserves data, datasets, labs, theme, size", () => {
    const spec = normalize({
      $schema: "x",
      data: { name: "cars" },
      datasets: { cars: { columns: { x: [1] } } },
      layers: [{ geom: "point", aes: { x: "x", y: "x" } }],
      labs: { title: "T" },
      theme: "dark",
      width: 640,
      height: 480,
    });
    expect(spec.$schema).toBe("x");
    expect(spec.data).toEqual({ name: "cars" });
    expect(spec.datasets).toEqual({ cars: { columns: { x: [1] } } });
    expect(spec.labs).toEqual({ title: "T" });
    expect(spec.theme).toBe("dark");
    expect(spec.width).toBe(640);
    expect(spec.height).toBe(480);
  });
});
