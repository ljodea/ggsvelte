import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

import { runPipeline } from "../../src/pipeline.js";

import { viewport } from "./fixtures.ts";

describe("style guides and legend interactivity", () => {
  it("preserves temporal semantics and formatted date labels on numeric style guides", () => {
    const result = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, when: "2024-01-01" },
            { x: 2, y: 2, when: "2024-01-03" },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, size: { field: "when" } },
        layers: [{ geom: "point" }],
        scales: {
          size: {
            type: "sequential",
            temporalKind: "date",
            parse: "ymd",
            labels: "%Y-%m-%d",
          },
        },
      }),
      viewport,
    );
    expect(result.scales.size?.scale.domain).toEqual([Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 3)]);
    const guide = result.guidePlans.find((plan) => plan.id === "guide:size");
    expect(guide?.type).toBe("discrete");
    if (guide?.type !== "discrete") throw new Error("expected size guide");
    expect(guide.entries[0]?.label).toBe("2024-01-01");
    const legend = result.scene.legends.find((candidate) => candidate.scale === "size");
    expect(legend?.type).toBe("discrete");
    if (legend?.type !== "discrete") throw new Error("expected discrete size legend");
    expect(legend.entries[0]?.label).toBe("2024-01-01");
  });

  it("trains a stat-only discrete numeric style from observed values and disables its legend", () => {
    // alpha is driven only by an after-stat column (count); stat columns never
    // reach the source catalog, so the ordinal domain must fall back to the
    // observed values instead of collapsing to an empty domain (which dropped
    // the legend entirely). And because a stat-only mapping has no field/constant
    // to index, the resulting discrete legend must be non-interactive.
    const model = runPipeline(
      fromAny({
        data: {
          values: [
            { cat: "a" },
            { cat: "a" },
            { cat: "b" },
            { cat: "b" },
            { cat: "b" },
            { cat: "c" },
          ],
        },
        aes: { x: { field: "cat" }, alpha: { stat: "count" } },
        layers: [{ geom: "bar" }],
        scales: { alpha: { type: "ordinal" } },
      }),
      viewport,
    );
    const plan = model.guidePlans.find((p) => p.aesthetic === "alpha");
    if (plan?.type !== "discrete") throw new Error("expected alpha discrete guide plan");
    // Observed per-bar counts {2,3,1} → three ordinal entries, not a dropped legend.
    expect(plan.entries.length).toBeGreaterThan(0);
    const legend = model.scene.legends.find(
      (entry) => entry.type === "discrete" && entry.scale === "alpha",
    );
    if (legend?.type !== "discrete") throw new Error("expected alpha discrete legend");
    expect(legend.interactive).toBe(false);
  });

  it("keeps a field-mapped discrete numeric style legend interactive", () => {
    // Contrast to the stat-only case: a real field mapping IS indexable, so the
    // discrete legend stays interactive (hover/click resolves rows).
    const model = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, grp: "a" },
            { x: 2, y: 2, grp: "b" },
            { x: 3, y: 3, grp: "c" },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, size: { field: "grp" } },
        layers: [{ geom: "point" }],
        scales: { size: { type: "ordinal" } },
      }),
      viewport,
    );
    const legend = model.scene.legends.find(
      (entry) => entry.type === "discrete" && entry.scale === "size",
    );
    if (legend?.type !== "discrete") throw new Error("expected size discrete legend");
    expect(legend.interactive).not.toBe(false);
  });

  it("honors authored guide breaks on a sequential numeric style scale", () => {
    // Sequential breaks are guide ticks (like color sequential scales), not bin
    // boundaries — they must not throw style-binned-breaks and should become the
    // legend ticks instead of the default linearTicks.
    const model = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, amount: 0 },
            { x: 2, y: 2, amount: 50 },
            { x: 3, y: 3, amount: 100 },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, size: { field: "amount" } },
        layers: [{ geom: "point" }],
        scales: { size: { type: "sequential", range: [2, 10], breaks: [0, 25, 50, 75, 100] } },
      }),
      viewport,
    );
    const plan = model.guidePlans.find((p) => p.aesthetic === "size");
    if (plan?.type !== "discrete") throw new Error("expected size guide plan");
    expect(plan.entries.map((entry) => entry.value)).toEqual([0, 25, 50, 75, 100]);
  });

  it("keeps adjacent default binned size edges distinguishable in legend labels (#955)", () => {
    const model = runPipeline(
      fromAny({
        data: {
          values: [0, 1, 2, 3, 4].map((amount, index) => ({
            x: index + 1,
            y: index + 1,
            amount,
          })),
        },
        aes: { x: { field: "x" }, y: { field: "y" }, size: { field: "amount" } },
        layers: [{ geom: "point" }],
        scales: { size: { type: "binned" } },
      }),
      viewport,
    );
    const plan = model.guidePlans.find((p) => p.aesthetic === "size");
    if (plan?.type !== "discrete") throw new Error("expected size discrete guide plan");
    expect(plan.entries.map((entry) => entry.label)).toEqual([
      "0.0–0.8",
      "0.8–1.6",
      "1.6–2.4",
      "2.4–3.2",
      "3.2–4.0",
    ]);
  });

  it("rejects a field-mapped style on a fixed-intercept annotation rule", () => {
    // An annotation rule emits no data rows, so a field mapping has nothing to
    // map and would produce NaN/invalid style vectors — reject it loudly.
    expect(() =>
      runPipeline(
        fromAny({
          data: {
            values: [
              { x: 1, y: 1, kind: "a" },
              { x: 2, y: 2, kind: "b" },
            ],
          },
          aes: { x: { field: "x" }, y: { field: "y" } },
          layers: [
            { geom: "point" },
            { geom: "rule", aes: { linetype: { field: "kind" } }, params: { yintercept: 2 } },
          ],
        }),
        viewport,
      ),
    ).toThrow(expect.objectContaining({ code: "unsupported-annotation-style" }));
  });

  it("allows a scaled-constant style on a fixed-intercept annotation rule", () => {
    // Constants (including { value, scale: true }) DO expand per emitted segment,
    // so they remain valid on annotation rules — only field/stat mappings reject.
    const model = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" } },
        layers: [
          { geom: "point" },
          {
            geom: "rule",
            aes: { linewidth: { value: 5, scale: true } },
            params: { yintercept: 1 },
          },
        ],
      }),
      viewport,
    );
    expect(model.scene.batches.some((batch) => batch.kind === "segments")).toBe(true);
  });

  it("keeps a rowless annotation scaled-constant legend non-interactive", () => {
    // A fixed-intercept rule's scaled constant lives on an n === 0 annotation
    // frame with no source row or lineage, so its legend entry would resolve to
    // an empty key bucket — hover/click emphasizing nothing. It must render but
    // stay non-interactive (contrast the field-mapped discrete legend above).
    const model = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" } },
        layers: [
          { geom: "point" },
          {
            geom: "rule",
            aes: { linetype: { value: "threshold", scale: true } },
            params: { yintercept: 1 },
          },
        ],
        scales: { linetype: { type: "ordinal" } },
      }),
      viewport,
    );
    const legend = model.scene.legends.find(
      (entry) => entry.type === "discrete" && entry.scale === "linetype",
    );
    if (legend?.type !== "discrete") throw new Error("expected linetype discrete legend");
    expect(legend.interactive).toBe(false);
  });

  it("excludes a rowless annotation value from a mixed interactive style legend", () => {
    // A data-backed linetype field makes the whole scale interactive; a rule
    // annotation constant sharing that scale indexes no rendered mark, so it must
    // not become a hover/clickable legend entry (an empty key bucket). It still
    // trains the scale (so the annotation renders) but is dropped from the legend.
    const model = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, group: "a" },
            { x: 2, y: 2, group: "a" },
            { x: 1, y: 3, group: "b" },
            { x: 2, y: 4, group: "b" },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" } },
        layers: [
          { geom: "line", aes: { linetype: { field: "group" } } },
          {
            geom: "rule",
            aes: { linetype: { value: "threshold", scale: true } },
            params: { yintercept: 2 },
          },
        ],
        scales: { linetype: { type: "ordinal" } },
      }),
      viewport,
    );
    const legend = model.scene.legends.find(
      (entry) => entry.type === "discrete" && entry.scale === "linetype",
    );
    if (legend?.type !== "discrete") throw new Error("expected linetype discrete legend");
    expect(legend.interactive).toBe(true);
    const values = legend.entries.map((entry) => entry.value);
    expect(values).toContain("a");
    expect(values).toContain("b");
    expect(values).not.toContain("threshold");
  });
});
