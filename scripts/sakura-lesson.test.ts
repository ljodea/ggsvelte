/**
 * The lesson's one invariant: the chart on the page, the fragment printed
 * beside it, and the finished file at the end all come from `foldSakura`, and
 * every accumulated spec really renders.
 *
 * Gate G1 lives here too — the reversed temporal y-axis is the one surface the
 * whole design rests on, so it is asserted against a real render (earlier
 * dates must sit ABOVE later ones), not against the spec that requested it.
 */
import { renderToSVGString, runPipeline } from "@ggsvelte/core";
import { loessFit } from "../packages/core/src/stats/loess.ts";
import { validate } from "@ggsvelte/spec";
import { describe, expect, it } from "bun:test";

import { kyotoSakura } from "../packages/svelte/src/lib/data/index.ts";
import {
  foldSakura,
  QUICKSTART_PAGE_SVELTE,
  SAKURA_BASELINE,
  SAKURA_FINISHED_SVELTE,
  SAKURA_LOESS_SPAN,
  SAKURA_STEPS,
} from "./quickstart.ts";

const rows = kyotoSakura.map((row) => ({ ...row }));
const finished = foldSakura(SAKURA_STEPS.length, rows);

/** Tick labels of one axis, top-to-bottom in screen order. */
function yTicks(spec: unknown): { label: string; pos: number }[] {
  const model = runPipeline(spec as never, { width: 900, height: 480 });
  return model.scene.panels[0]!.axisY.map((tick) => ({
    label: tick.label,
    pos: tick.pos,
  }));
}

describe("the sakura lesson folds to renderable specs", () => {
  it("starts from a plain scatter of every observation", () => {
    const start = foldSakura(0, rows);
    expect(start.spec.layers).toEqual([{ geom: "point", render: "canvas" }]);
    expect(start.spec.scales).toBeUndefined();
    expect(start.spec.theme).toBeUndefined();
    expect(start.key).toBeUndefined();
    expect(start.source).toBe(QUICKSTART_PAGE_SVELTE);
    const model = runPipeline(start.spec, { width: 900, height: 480 });
    expect(model.scene.batches[0]!.kind).toBe("points");
  });

  it("validates and renders at every step", () => {
    for (let count = 0; count <= SAKURA_STEPS.length; count += 1) {
      const step = foldSakura(count, rows);
      const result = validate(step.spec);
      expect(result.ok, `step ${count}: ${JSON.stringify(result)}`).toBe(true);
      const svg = renderToSVGString(step.spec, { width: 900, height: 480 });
      expect(svg).toContain("<svg");
    }
  });

  it("adds exactly one visible element per step", () => {
    const layerCounts = Array.from({ length: SAKURA_STEPS.length + 1 }, (_, count) => {
      const spec = foldSakura(count, rows).spec as { layers: unknown[] };
      return spec.layers.length;
    });
    expect(layerCounts).toEqual([1, 2, 2, 4, 7, 7, 7]);
    for (let i = 1; i < layerCounts.length; i += 1) {
      expect(layerCounts[i]!).toBeGreaterThanOrEqual(layerCounts[i - 1]!);
    }
  });

  it("keeps the finished chart identical to the finished source", () => {
    expect(finished.source).toBe(SAKURA_FINISHED_SVELTE);
    expect(finished.key).toBe("year");
    expect(finished.inspect).toEqual({ mode: "exact", pin: true });
    // Every step's contribution is really in the file the reader ends up with.
    // A key a later step sets again (labs gains a title in the last step) is
    // superseded on purpose, so the surviving text is the LAST writer's.
    const lastAttr = new Map<string, string>();
    const lastChild = new Map<string, string>();
    for (const step of SAKURA_STEPS) {
      for (const [key, text] of Object.entries(step.source.attrs ?? {})) lastAttr.set(key, text);
      for (const [key, text] of Object.entries(step.source.children ?? {}))
        lastChild.set(key, text);
    }
    for (const [key, text] of [...lastAttr, ...lastChild]) {
      expect(SAKURA_FINISHED_SVELTE, `finished file lost ${key}`).toContain(text);
    }
    // And nothing is silently dropped: every layer named in the final order is
    // drawn in the file.
    expect(lastChild.size).toBe((finished.spec.layers as unknown[]).length);
  });

  it("prints fragments that carry the values the chart is rendered with", () => {
    // Each pair is (what the reader reads, what the renderer is handed). They
    // are written independently on purpose: the test is the thing that stops
    // the two from drifting.
    const pairs: [number, string, string][] = [
      [0, "loess", '"method":"loess"'],
      [0, `span={${SAKURA_LOESS_SPAN}}`, `"span":${SAKURA_LOESS_SPAN}`],
      [0, "alpha={0.5}", '"alpha":0.5'],
      [1, "reverse: true", '"reverse":true'],
      [1, '"%b %d"', '"dateLabels":"%b %d"'],
      [2, "x: null", '"x":null'],
      [2, 'fill: "epoch"', '"fill":{"field":"epoch"}'],
      [3, SAKURA_BASELINE, `"yintercept":"${SAKURA_BASELINE}"`],
      [3, '"#b3452f"', '"value":"#b3452f"'],
      [4, 'theme="tufte"', '"theme":"tufte"'],
      [5, 'key="year"', ""],
    ];
    for (const [index, inFragment, inSpec] of pairs) {
      const step = SAKURA_STEPS[index]!;
      expect(step.fragment, `${step.id}: fragment omits ${inFragment}`).toContain(inFragment);
      if (inSpec === "") continue;
      const delta = JSON.stringify(step.spec);
      expect(delta, `${step.id}: spec omits ${inSpec}`).toContain(inSpec);
    }
    // key/inspect are runtime props, not spec fields — assert them there.
    expect(finished.key).toBe("year");
  });

  it("keeps every step's chapter link resolvable", () => {
    for (const step of SAKURA_STEPS) {
      expect(step.href).toMatch(/^\/guide\/[a-z-]+#[a-z-]+$/);
      expect(step.chapterTitle.length).toBeGreaterThan(3);
    }
  });
});

describe("gate G1 — the reversed temporal y-axis", () => {
  const reversed = foldSakura(2, rows);

  it("formats bloom days as dates, not numbers", () => {
    const ticks = yTicks(reversed.spec);
    expect(ticks.length).toBeGreaterThan(2);
    for (const tick of ticks) {
      expect(tick.label).toMatch(/^[A-Z][a-z]{2} \d{2}$/);
    }
  });

  it("puts earlier bloom above later bloom", () => {
    const ticks = yTicks(reversed.spec);
    const march = ticks.find((tick) => tick.label.startsWith("Mar"));
    const late = ticks.findLast((tick) => tick.label.startsWith("Apr"));
    expect(march).toBeDefined();
    expect(late).toBeDefined();
    // SVG y grows downward: earlier date => smaller y => higher on screen.
    expect(march!.pos).toBeLessThan(late!.pos);
    for (let i = 1; i < ticks.length; i += 1) {
      expect(ticks[i]!.pos).toBeGreaterThan(ticks[i - 1]!.pos);
    }
  });

  it("is the reversal doing the work, not the calendar", () => {
    const spec = structuredClone(reversed.spec) as { scales: { y: { reverse?: boolean } } };
    delete spec.scales.y.reverse;
    const ticks = yTicks(spec);
    const march = ticks.find((tick) => tick.label.startsWith("Mar"));
    const late = ticks.findLast((tick) => tick.label.startsWith("Apr"));
    expect(march!.pos).toBeGreaterThan(late!.pos);
  });
});

describe("gate G4 — the loess trend", () => {
  it("draws a fitted path, not the raw points", () => {
    const model = runPipeline(foldSakura(1, rows).spec, { width: 900, height: 480 });
    const trend = model.scene.batches.find((batch) => batch.kind === "paths");
    expect(trend).toBeDefined();
    const vertices = Object.keys(trend!.positions).length / 2;
    expect(vertices).toBeGreaterThan(40);
    expect(vertices).toBeLessThan(rows.length);
  });

  it("reads as one signal: flat for a millennium, then early", () => {
    const fit = loessFit(
      new Float64Array(rows.map((row) => row.year)),
      new Float64Array(rows.map((row) => row.bloomDoy)),
      { span: SAKURA_LOESS_SPAN, degree: 2, statistics: false },
    );
    expect(fit).not.toBeNull();
    const at = (year: number): number => fit!.predict(year);

    // The claim the subtitle makes: about a week earlier than the millennium.
    expect(at(1900) - at(2026)).toBeGreaterThan(7);

    // And the millennium really is flat — every century from 1100 to 1850 sits
    // within a couple of days of the pre-industrial baseline.
    const settled: number[] = [];
    for (let year = 1100; year <= 1850; year += 25) settled.push(at(year));
    const spread = Math.max(...settled) - Math.min(...settled);
    expect(spread).toBeLessThan(3);
    expect(spread).toBeLessThan((at(1900) - at(2026)) / 2);
  });
});
