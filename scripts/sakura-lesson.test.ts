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
import { validate } from "@ggsvelte/spec";
import { describe, expect, it } from "bun:test";

import { kyotoSakura } from "../packages/svelte/src/lib/data/index.ts";
import {
  measureSakuraFinishedSize,
  SAKURA_HEIGHT_PROBE_WIDTHS,
  SAKURA_PANEL_ASPECT,
} from "./gen-lesson-charts.ts";
import {
  foldSakura,
  QUICKSTART_PAGE_SVELTE,
  quickstartAriaLabel,
  quickstartTitle,
  SAKURA_BASELINE,
  SAKURA_BINWIDTH,
  SAKURA_EPOCHS,
  SAKURA_FINISHED_SVELTE,
  SAKURA_STEPS,
  SAKURA_Y_BREAKS,
  SAKURA_Y_LAB,
} from "./quickstart.ts";

const rows = kyotoSakura.map((row) => ({ ...row }));
const finished = foldSakura(SAKURA_STEPS.length, rows);

/** Tick labels of one axis, top-to-bottom in screen order. */
function yTicks(spec: unknown): { label: string; pos: number }[] {
  const model = runPipeline(spec as never, { width: 900, height: 480 });
  // SceneTick[] | null — a panel renders no y-axis when placement says so. G1
  // (earlier dates sit above later ones) is asserted against these ticks, so a
  // missing axis has to say that, not die inside .map on null.
  const axisY = model.scene.panels[0]?.axisY;
  if (axisY === undefined || axisY === null) {
    throw new Error("expected the first panel to render a y-axis");
  }
  return axisY.map((tick) => ({
    label: tick.label,
    pos: tick.pos,
  }));
}

describe("the sakura lesson folds to renderable specs", () => {
  it("starts from a plain scatter of every observation", () => {
    const start = foldSakura(0, rows);
    expect(start.spec.layers).toEqual([{ geom: "point" }]);
    // Year ticks use labels: "d" from the first render so 1000 CE is not "1,000".
    expect(start.spec.scales).toEqual({ x: { type: "linear", labels: "d" } });
    expect(start.spec.labs).toEqual({ x: "Year", y: SAKURA_Y_LAB });
    expect(start.spec.theme).toBeUndefined();
    expect(start.key).toBeUndefined();
    expect(start.source).toBe(QUICKSTART_PAGE_SVELTE);
    expect(start.source).toContain('<ScaleXContinuous labels="d" />');
    expect(start.source).toContain(`<Labs x="Year" y="${SAKURA_Y_LAB}" />`);
    const model = runPipeline(start.spec, { width: 900, height: 480 });
    expect(model.scene.batches[0]!.kind).toBe("points");
    const yearLabels = model.scene.axes.x?.ticks
      .filter((tick) => tick.showLabel === true)
      .map((tick) => tick.label);
    expect(yearLabels).toContain("1000");
    expect(yearLabels).not.toContain("1,000");
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

  it("exposes title and aria-label from the folded starting page", () => {
    // consumer-compat also asserts these against a packed app; keep a direct
    // unit guard so the extractors stay covered without that harness.
    expect(quickstartTitle()).toBe("<title>Kyoto cherry blossom</title>");
    expect(quickstartAriaLabel()).toBe(
      "Kyoto peak bloom, 812 to 2026: about a week earlier since 1850",
    );
  });

  it("drops record callouts when annotations are disabled", () => {
    // GettingStartedGuide uses this below ~560px so hand-placed text does not
    // collide with the data. Bands, trend, baseline, and points stay.
    const full = foldSakura(SAKURA_STEPS.length, rows);
    const narrow = foldSakura(SAKURA_STEPS.length, rows, { annotations: false });
    expect((full.spec.layers as unknown[]).length).toBe(7);
    expect((narrow.spec.layers as unknown[]).length).toBe(5);
    const kinds = (narrow.spec.layers as { geom: string }[]).map((layer) => layer.geom);
    expect(kinds).not.toContain("segment");
    expect(kinds).not.toContain("text");
    expect(kinds).toContain("point");
    expect(kinds).toContain("line");
    expect(kinds).toContain("rect");
    expect(kinds).toContain("rule");
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
      // Grammar children ride with the attrs they replaced (#659 slice 8):
      // they are not layers, so they must stay out of the layer count below.
      for (const [key, text] of Object.entries(step.source.grammar ?? {})) lastAttr.set(key, text);
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
      [0, 'stat="summary_bin"', '"stat":"summary_bin"'],
      [0, 'fun="median"', '"fun":"median"'],
      [0, `binwidth={${SAKURA_BINWIDTH}}`, `"binwidth":${SAKURA_BINWIDTH}`],
      [0, 'curve="step-hv"', '"curve":"step-hv"'],
      [0, "alpha={0.5}", '"alpha":0.5'],
      [1, "reverse", '"reverse":true'],
      [1, "ScaleYDate", '"dateLabels":"%b %d"'],
      [1, "ScaleXContinuous", '"labels":"d"'],
      [1, SAKURA_Y_BREAKS[0], `"breaks":${JSON.stringify([...SAKURA_Y_BREAKS])}`],
      [2, "x: null", '"x":null'],
      [2, 'fill: "epoch"', '"fill":{"field":"epoch"}'],
      [2, "GuideLegend", '"position":"bottom"'],
      [2, "ScaleFillManual", '"type":"manual"'],
      [3, SAKURA_BASELINE, `"yintercept":"${SAKURA_BASELINE}"`],
      [3, '"#b3452f"', '"value":"#b3452f"'],
      [4, "<ThemeTufte />", '"theme":"tufte"'],
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

  it("uses only attributes the geom components actually accept", () => {
    // The finished file is copied into a consumer's own type-checked app, so
    // a spec-level field spelled as a component prop (`render`) type-errors
    // there and nowhere else. Keep the two vocabularies apart.
    const componentProps = new Set([
      "data",
      "aes",
      "alpha",
      "size",
      "linewidth",
      "stat",
      "fun",
      "binwidth",
      "curve",
      "yintercept",
      "position",
      "positionParams",
    ]);
    const children = SAKURA_STEPS.flatMap((step) =>
      Object.values(step.source.children ?? {}),
    ).concat("  <GeomPoint />");
    for (const child of children) {
      for (const match of child.matchAll(/^\s{4}([a-zA-Z]+)=/gm)) {
        const attribute = match[1];
        if (attribute === undefined) throw new Error(`unparsed prop line: ${match[0]}`);
        expect(componentProps.has(attribute), `<Geom…> has no ${attribute} prop`).toBe(true);
      }
      expect(child, "spec-level render hint spelled as a prop").not.toContain("render=");
    }
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
    expect(ticks.map((tick) => tick.label)).toEqual(["Apr 05", "Apr 15", "Apr 25"]);
  });

  it("puts earlier bloom above later bloom", () => {
    const ticks = yTicks(reversed.spec);
    // SVG y grows downward: earlier date => smaller y => higher on screen.
    expect(ticks[0]!.label).toBe("Apr 05");
    expect(ticks[2]!.label).toBe("Apr 25");
    expect(ticks[0]!.pos).toBeLessThan(ticks[2]!.pos);
    for (let i = 1; i < ticks.length; i += 1) {
      expect(ticks[i]!.pos).toBeGreaterThan(ticks[i - 1]!.pos);
    }
  });

  it("is the reversal doing the work, not the calendar", () => {
    const spec = structuredClone(reversed.spec) as { scales: { y: { reverse?: boolean } } };
    delete spec.scales.y.reverse;
    const ticks = yTicks(spec);
    expect(ticks[0]!.label).toBe("Apr 05");
    expect(ticks[2]!.label).toBe("Apr 25");
    expect(ticks[0]!.pos).toBeGreaterThan(ticks[2]!.pos);
  });
});

describe("gate G4 — the binned-median step trend", () => {
  it("draws a step path of bin medians, not a loess or the raw points", () => {
    // foldSakura(2): trend + reversed date axis (the finished reading order).
    const model = runPipeline(foldSakura(2, rows).spec, { width: 900, height: 360 });
    const trend = model.scene.batches.find((batch) => batch.kind === "paths");
    expect(trend).toBeDefined();
    expect(trend!.curve).toBe("step-hv");
    const vertices = trend!.positions.length / 2;
    // ~1200 years / 25-year bins ≈ 50 non-empty bins — far fewer than 838 points.
    expect(vertices).toBeGreaterThan(30);
    expect(vertices).toBeLessThan(80);
    expect(vertices).toBeLessThan(rows.length / 5);
  });

  it("reads as one signal: flat for a millennium, then early", () => {
    const model = runPipeline(foldSakura(2, rows).spec, { width: 900, height: 360 });
    const trend = model.scene.batches.find((batch) => batch.kind === "paths");
    expect(trend).toBeDefined();
    // Screen y grows downward; reverse date scale puts earlier bloom higher
    // (smaller y). Average the pre-industrial middle third vs the modern last
    // third — a single end bin can be noisy.
    const n = trend!.positions.length / 2;
    const third = Math.floor(n / 3);
    let midSum = 0;
    let lateSum = 0;
    for (let i = third; i < 2 * third; i += 1) midSum += trend!.positions[i * 2 + 1]!;
    for (let i = n - third; i < n; i += 1) lateSum += trend!.positions[i * 2 + 1]!;
    expect(lateSum / third).toBeLessThan(midSum / third);
  });
});

describe("gate G5 — climate epoch bands claim periods, not the record", () => {
  it("starts after the first observation and leaves a gap between MWP and LIA", () => {
    expect(SAKURA_EPOCHS.map((band) => [band.year, band.until])).toEqual([
      [950, 1250],
      [1300, 1850],
      [1850, 2026],
    ]);
    // First band does not start at the first observation year.
    expect(SAKURA_EPOCHS[0]!.year).toBeGreaterThan(812);
    // Gap between Medieval Warm Period and Little Ice Age.
    expect(SAKURA_EPOCHS[1]!.year).toBeGreaterThan(SAKURA_EPOCHS[0]!.until);
  });

  it("folds those bounds into the rect layer and the source const", () => {
    const folded = foldSakura(3, rows);
    const epochs = folded.spec.layers.find((layer) => layer.geom === "rect");
    expect(epochs?.data).toEqual({ values: SAKURA_EPOCHS });
    expect(folded.source).toContain("year: 950, until: 1250");
    expect(folded.source).toContain("year: 1300, until: 1850");
    // Bands claim climate periods, not the extent of the record.
    expect(folded.source).not.toContain("year: 812");
  });
});

describe("gate G6 — finished chart panel aspect, not outer SVG aspect", () => {
  it("keeps the data panel near 2.5:1 after title/subtitle/legend/caption chrome", () => {
    // Outer height targets the panel: PR #1073 set outer 2.5:1 and crushed the
    // panel to ~5.8:1. Assert the panel at several widths, including a narrow
    // one where the legend wraps.
    for (const width of SAKURA_HEIGHT_PROBE_WIDTHS) {
      const size = measureSakuraFinishedSize(width);
      const aspect = size.panelWidth / size.panelHeight;
      expect(
        aspect,
        `width ${String(width)}: panel ${String(size.panelWidth)}×${String(size.panelHeight)}`,
      ).toBeGreaterThanOrEqual(SAKURA_PANEL_ASPECT - 0.2);
      expect(aspect).toBeLessThanOrEqual(SAKURA_PANEL_ASPECT + 0.2);
    }
  });
});
