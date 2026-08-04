/**
 * The lesson's one invariant: the chart on the page, the fragment printed
 * beside it, and the finished file at the end all come from `foldSakura`, and
 * every accumulated spec really renders.
 *
 * Gate G1 lives here too — the reversed temporal y-axis is the one surface the
 * whole design rests on, so it is asserted against a real render (earlier
 * dates must sit ABOVE later ones), not against the spec that requested it.
 */
import { registerAll, renderToSVGString, runPipeline } from "@ggsvelte/core";

// Headless full-grammar rendering (#1420): explicit opt-in.
registerAll();
import { validate } from "@ggsvelte/spec";
import { describe, expect, it } from "bun:test";

import { kyotoSakura } from "../packages/svelte/src/lib/data/index.ts";
import {
  measureSakuraFinishedSize,
  SAKURA_HEIGHT_PROBE_WIDTHS,
  SAKURA_PANEL_ASPECT,
} from "./gen-lesson-charts.ts";
import {
  finishedPortableSpecNamed,
  foldSakura,
  QUICKSTART_PAGE_SVELTE,
  QUICKSTART_PORTABLE_SPEC_FRAGMENT,
  SAKURA_BASELINE,
  SAKURA_RECORDS,
  SAKURA_TREND_WINDOW,
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
    // Domain is fixed on the first render so ticks stay stable as steps add chrome.
    // bloomDate is a full ISO calendar date per year; without month-day y the
    // auto scale draws year-vs-year (a diagonal) instead of bloom timing.
    expect(start.spec.scales).toEqual({
      x: { type: "linear", labels: "d", domain: [800, 2030] },
      y: { type: "time", temporalKind: "monthDay", reverse: true },
    });
    expect(start.spec.labs).toEqual({ x: "Year", y: SAKURA_Y_LAB });
    expect(start.spec.theme).toBeUndefined();
    expect(start.key).toBeUndefined();
    expect(start.source).toBe(QUICKSTART_PAGE_SVELTE);
    expect(start.source).toContain('<ScaleXContinuous labels="d" domain={[800, 2030]} />');
    expect(start.source).toContain("<ScaleYMonthDay reverse />");
    expect(start.source).toContain(`<Labs x="Year" y="${SAKURA_Y_LAB}" />`);
    const model = runPipeline(start.spec, { width: 900, height: 480 });
    expect(model.scene.batches[0]!.kind).toBe("points");
    const yearLabels = model.scene.axes.x?.ticks
      .filter((tick) => tick.showLabel === true)
      .map((tick) => tick.label);
    expect(yearLabels).toContain("1000");
    expect(yearLabels).not.toContain("1,000");
    // Y must read as bloom season, not as CE years (the pre-fix diagonal).
    const bloomLabels = model.scene.axes.y?.ticks
      .filter((tick) => tick.showLabel === true)
      .map((tick) => tick.label);
    expect(bloomLabels?.some((label) => /1000|1200|1400|1600|1800|2000/.test(label))).toBe(false);
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

  it("grows the layer set at every step", () => {
    const layerCounts = Array.from({ length: SAKURA_STEPS.length + 1 }, (_, count) => {
      const spec = foldSakura(count, rows).spec as { layers: unknown[] };
      return spec.layers.length;
    });
    // base → theme+trend+chartlines+y-ticks → epochs → annotate → finish
    expect(layerCounts).toEqual([1, 4, 6, 13, 13]);
    for (let i = 1; i < layerCounts.length; i += 1) {
      expect(layerCounts[i]!).toBeGreaterThanOrEqual(layerCounts[i - 1]!);
    }
  });

  it("keeps the basic plot free of production polish props", () => {
    // ariaLabel is production polish — not what a new reader should copy first.
    expect(QUICKSTART_PAGE_SVELTE).not.toContain("ariaLabel");
    expect(QUICKSTART_PAGE_SVELTE).not.toContain("<svelte:head>");
  });

  it("drops record callouts when annotations are disabled", () => {
    // GettingStartedGuide uses this below ~560px so hand-placed text does not
    // collide with the data. Bands, trend, baseline, and points stay.
    const full = foldSakura(SAKURA_STEPS.length, rows);
    const narrow = foldSakura(SAKURA_STEPS.length, rows, { annotations: false });
    expect((full.spec.layers as unknown[]).length).toBe(13);
    expect((narrow.spec.layers as unknown[]).length).toBe(10);
    const kinds = (narrow.spec.layers as { geom: string }[]).map((layer) => layer.geom);
    expect(kinds).not.toContain("segment");
    // The epoch names stay: they are spread one per band rather than clustered
    // around three points, and they are the only thing naming the bands now
    // that the legend is gone. Measured down to a 560px container without
    // collision, which is the width this option kicks in at.
    const labels = (narrow.spec.layers as { geom: string; data?: { values?: unknown[] } }[]).filter(
      (layer) => layer.geom === "text",
    );
    expect(labels).toHaveLength(1);
    expect(labels[0]!.data?.values).toHaveLength(3);
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
      // Grammar children ride with the attrs they replaced (#659 slice 8).
      // They are plot layers (scale/theme/labs/guides/…), but not mark layers,
      // so they must stay out of the PortableSpec `layers[]` / mark count below.
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
    // Callout leaders are still part of the finished wide chart — source must
    // not claim layers the fold dropped (or omit layers the fold still draws).
    const geoms = (finished.spec.layers as { geom: string }[]).map((layer) => layer.geom);
    expect(geoms).toContain("segment");
    expect(SAKURA_FINISHED_SVELTE).toContain("<GeomSegment");
    expect(geoms).toEqual([
      "rect",
      "text",
      "rule",
      "rule",
      "point",
      "rule",
      "text",
      "line",
      "point",
      "point",
      "point",
      "segment",
      "text",
    ]);
  });

  it("rings the three record years like the reference chart", () => {
    // Tufte circles the records: open rings on the all-time earliest (1409,
    // red) and latest (1323, blue), a filled red dot on the modern record
    // (2023). Rings ride on the same rows as the callouts, so a record can
    // never drift from its circle.
    const layers = finished.spec.layers as {
      geom: string;
      data?: { values?: Record<string, unknown>[] };
      aes?: Record<string, unknown>;
      params?: Record<string, unknown>;
    }[];
    const ringLatest = layers.find(
      (layer) =>
        layer.geom === "point" &&
        layer.params?.["shape"] === "circle-open" &&
        JSON.stringify(layer.aes?.["color"]) === '{"value":"#2c5282"}',
    );
    const ringEarliest = layers.find(
      (layer) =>
        layer.geom === "point" &&
        layer.params?.["shape"] === "circle-open" &&
        JSON.stringify(layer.aes?.["color"]) === '{"value":"#c53030"}',
    );
    const recordRecent = layers.find(
      (layer) =>
        layer.geom === "point" &&
        layer.params?.["shape"] === undefined &&
        JSON.stringify(layer.aes?.["color"]) === '{"value":"#c53030"}',
    );
    expect(ringLatest?.data?.values).toEqual([{ year: 1323, bloomDate: "05-04" }]);
    expect(ringLatest?.params?.["size"]).toBe(3.5);
    expect(ringEarliest?.data?.values).toEqual([{ year: 1409, bloomDate: "03-27" }]);
    expect(ringEarliest?.params?.["size"]).toBe(3.5);
    expect(recordRecent?.data?.values).toEqual([{ year: 2023, bloomDate: "03-25" }]);
    expect(recordRecent?.params?.["size"]).toBe(3);
    // The trend is the reference's 30-year running median, not a binned stand-in.
    const trend = layers.find((layer) => layer.geom === "line");
    expect(trend?.params?.["window"]).toBe(SAKURA_TREND_WINDOW);
    expect(trend?.params?.["fun"]).toBe("median");
  });

  it("publishes agent JSON that is the finished fold with named plot data only", () => {
    // No hand-authored stub: the JSON copy block must match foldSakura except
    // plot data is { name: "kyotoSakura" } (never a partial inline sample of
    // the 838-row series). Annotation tables (epochs, records) stay as values.
    const named = finishedPortableSpecNamed();
    expect(named.data).toEqual({ name: "kyotoSakura" });
    expect(named).not.toHaveProperty("datasets");
    // No bogus inline sample of the series — named ref only at plot level.
    expect(JSON.stringify(named.data)).not.toMatch(/812|"bloomDate"/);
    const parsed = JSON.parse(QUICKSTART_PORTABLE_SPEC_FRAGMENT) as typeof named;
    expect(parsed).toEqual(named);

    const { data: _plotData, ...finishedWithoutData } = finished.spec;
    const { data: namedData, ...namedWithoutData } = named;
    expect(namedData).toEqual({ name: "kyotoSakura" });
    expect(namedWithoutData).toEqual(finishedWithoutData);
    // Agent JSON must carry every finished layer geom — not a point+line fiction.
    const geoms = (named.layers as { geom: string }[]).map((layer) => layer.geom);
    expect(geoms).toEqual([
      "rect",
      "text",
      "rule",
      "rule",
      "point",
      "rule",
      "text",
      "line",
      "point",
      "point",
      "point",
      "segment",
      "text",
    ]);
    expect(named.theme).toBe("tufte");
    expect(named.scales?.y).toMatchObject({
      temporalKind: "monthDay",
      reverse: true,
      dateLabels: "%b %e",
    });
  });

  it("draws the finished file's chartlines as thick as the chart beside it", () => {
    // Review on #1469 caught the copyable file drifting to 0.5 while the
    // fragment and rendered spec used 0.75 — pin the third surface too.
    for (const y of [SAKURA_Y_BREAKS[0], SAKURA_Y_BREAKS[2]]) {
      expect(
        SAKURA_FINISHED_SVELTE,
        `finished file chartline at ${y} drifts from the chart`,
      ).toContain(`yintercept="${y}"\n    linewidth={0.75}`);
    }
  });

  it("prints fragments that carry the values the chart is rendered with", () => {
    // Each pair is (what the reader reads, what the renderer is handed). They
    // are written independently on purpose: the test is the thing that stops
    // the two from drifting.
    const pairs: [number, string, string][] = [
      [0, 'stat="summary_rolling"', '"stat":"summary_rolling"'],
      [0, 'fun="median"', '"fun":"median"'],
      [0, `window={${SAKURA_TREND_WINDOW}}`, `"window":${SAKURA_TREND_WINDOW}`],
      [0, 'curve="linear"', '"curve":"linear"'],
      [0, "alpha={0.55}", '"alpha":0.55'],
      [0, `yintercept="${SAKURA_Y_BREAKS[0]}"`, `"yintercept":"${SAKURA_Y_BREAKS[0]}"`],
      [0, '"dotted"', '"value":"dotted"'],
      [0, "<ThemeTufte />", '"theme":"tufte"'],
      [0, "ScaleYMonthDay", '"dateLabels":"%b %e"'],
      [0, SAKURA_Y_BREAKS[0], `"breaks":${JSON.stringify([...SAKURA_Y_BREAKS])}`],
      [1, "x: null", '"x":null'],
      [1, 'fill: "epoch"', '"fill":{"field":"epoch"}'],
      [1, "GuideNone", '"fill":{"type":"none"}'],
      [1, 'label: "epoch"', '"label":{"field":"epoch"}'],
      [1, "ScaleFillManual", '"type":"manual"'],
      [2, SAKURA_BASELINE, `"yintercept":"${SAKURA_BASELINE}"`],
      [2, "data={baselineLabel}", '"label":"median"'],
      [2, '"#b3452f"', '"value":"#b3452f"'],
      [3, 'key="year"', ""],
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
      "anchor",
      "dx",
      "dy",
      "linewidth",
      "stat",
      "fun",
      "window",
      "shape",
      "curve",
      "yintercept",
      "position",
      "positionParams",
      // #1068 / #1065: decorative epoch bands opt out of inspection.
      "inspect",
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
});

describe("gate G1 — the reversed temporal y-axis", () => {
  // After the merged theme/median/y-tick step (count 1), y has Apr day breaks.
  const reversed = foldSakura(1, rows);

  it("formats bloom days as dates, not numbers", () => {
    const ticks = yTicks(reversed.spec);
    expect(ticks.map((tick) => tick.label)).toEqual(["Apr 5", "Apr 15", "Apr 25"]);
  });

  it("puts earlier bloom above later bloom", () => {
    const ticks = yTicks(reversed.spec);
    // SVG y grows downward: earlier date => smaller y => higher on screen.
    expect(ticks[0]!.label).toBe("Apr 5");
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
    expect(ticks[0]!.label).toBe("Apr 5");
    expect(ticks[2]!.label).toBe("Apr 25");
    expect(ticks[0]!.pos).toBeGreaterThan(ticks[2]!.pos);
  });
});

describe("gate G8 — annotations that do not fight the chart", () => {
  const finishedSpec = () => foldSakura(SAKURA_STEPS.length, rows).spec;

  it("labels the baseline where the least data sits", () => {
    // The reference tags the rule with the single word "median", below it.
    // Measured placement search over the rendered scene: below the rule at
    // the left edge is the one pocket whose box touches no trend vertex and
    // exactly one faint bloom (the 891 observation) at any wide width — every
    // other candidate sits on more data. Pin that measurement so the tag
    // cannot drift back onto the scatter (it overprinted ~20 blooms when
    // placed at the right edge).
    for (const width of [768, 900]) {
      const model = runPipeline(finishedSpec(), { width, height: 330 });
      const glyphs = model.scene.batches.find(
        (batch) => batch.kind === "glyphs" && batch.texts.includes("median"),
      );
      expect(glyphs, `baseline tag missing at ${width}`).toBeDefined();
      if (glyphs === undefined || glyphs.kind !== "glyphs") continue;
      const i = glyphs.texts.indexOf("median");
      const gx = glyphs.positions[i * 2]!;
      const gy = glyphs.positions[i * 2 + 1]!;
      const bw = glyphs.boxWidths![i]!;
      const bh = glyphs.boxHeights![i]!;
      // anchor start; the SVG renderer draws text with dy 0.32em, so the ink
      // spans roughly [gy − 0.75·bh, gy + 0.25·bh].
      const box = { x0: gx - 1, x1: gx + bw + 1, y0: gy - bh * 0.75 - 1, y1: gy + bh * 0.25 + 1 };
      let points = 0;
      let trend = 0;
      for (const batch of model.scene.batches) {
        if (batch.kind !== "points" && batch.kind !== "paths") continue;
        for (let p = 0; p < batch.positions.length / 2; p += 1) {
          const px = batch.positions[p * 2]!;
          const py = batch.positions[p * 2 + 1]!;
          if (px >= box.x0 && px <= box.x1 && py >= box.y0 && py <= box.y1) {
            if (batch.kind === "points") points += 1;
            else trend += 1;
          }
        }
      }
      expect(trend, `baseline tag crosses the trend at ${width}px`).toBe(0);
      expect(points, `baseline tag overprints ${points} blooms at ${width}px`).toBeLessThanOrEqual(
        1,
      );
    }
  });

  it("keeps no-answer decoration out of inspection", () => {
    // A yintercept rule synthesizes an empty row; when it wins the
    // nearest-candidate race the tooltip renders nothing — the same #1068
    // capture the bands and names already opt out of.
    const spec = finishedSpec() as {
      layers: { geom: string; inspect?: boolean }[];
    };
    const rules = spec.layers.filter((layer) => layer.geom === "rule");
    expect(rules.length).toBe(3);
    for (const rule of rules) expect(rule.inspect, "rule layer stays inspectable").toBe(false);
    // …and the copyable file mirrors the opt-out on every GeomRule.
    const ruleTags = SAKURA_FINISHED_SVELTE.match(/<GeomRule[\s\S]*?\/>/g) ?? [];
    expect(ruleTags.length).toBe(3);
    for (const tag of ruleTags) expect(tag).toContain("inspect={false}");
  });

  it("names the bands where the reader is looking, with no legend", () => {
    const spec = finishedSpec() as {
      guides?: { fill?: { type: string } };
      labs?: { fill?: string };
    };
    expect(spec.guides?.fill?.type).toBe("none");
    expect(spec.labs?.fill).toBeUndefined();

    const names = (
      finishedSpec() as { layers: { geom: string; data?: { values?: unknown[] } }[] }
    ).layers
      .filter((layer) => layer.geom === "text")
      .flatMap((layer) => (layer.data?.values ?? []) as { epoch?: string }[])
      .map((row) => row.epoch)
      .filter(Boolean);
    expect(names).toEqual(["Medieval warm period", "Little Ice Age", "Industrial era"]);
  });

  it("sits epoch names above the band rects, which still cover every observation", () => {
    // Labels live in a domain strip above the pale fills — not painted on the
    // fill. Band top stays earlier than the earliest bloom so every point is
    // still inside a climate band; domain expands above the band for names.
    type EpochRow = { top: string; bottom: string; epoch: string };
    type NameRow = { nameDate: string; epoch: string };
    const folded = finishedSpec() as {
      layers: { geom: string; data?: { values?: unknown[] } }[];
      scales?: { y?: { domain?: string[] } };
    };
    const epochs = folded.layers.find((layer) => layer.geom === "rect")?.data?.values as
      | EpochRow[]
      | undefined;
    const nameRows = folded.layers
      .filter((layer) => layer.geom === "text")
      .flatMap((layer) => (layer.data?.values ?? []) as NameRow[])
      .filter((row) => typeof row.nameDate === "string");
    expect(epochs?.length).toBe(3);
    expect(nameRows.length).toBe(3);

    const bandTop = epochs![0]!.top;
    const nameDate = nameRows[0]!.nameDate;
    // On a reverse month-day axis, earlier (smaller MM-DD) is higher. Names
    // must be earlier than the band top so they sit above the rect.
    expect(nameDate < bandTop, `${nameDate} should be earlier than band top ${bandTop}`).toBe(true);
    for (const band of epochs!) {
      expect(band.top).toBe(bandTop);
    }

    // Earliest observation in the series is 25 March — band top must stay at
    // or earlier than that so the rect still encompasses every point.
    const earliestBloom = rows
      .map((row) => {
        const bloomDate = row["bloomDate"];
        return typeof bloomDate === "string" ? bloomDate.slice(-5) : "";
      })
      .filter((md) => md !== "")
      .toSorted()[0]!;
    expect(bandTop <= earliestBloom).toBe(true);

    // domain is [later bottom, earlier top] in the fold; top must clear names.
    const domain = folded.scales?.y?.domain;
    expect(domain).toBeDefined();
    const domainTop = domain![1]!;
    expect(domainTop <= nameDate, `domain top ${domainTop} must clear name ${nameDate}`).toBe(true);

    // Rendered: epoch name screen-y is above (strictly smaller than) band rect top.
    const svg = renderToSVGString(finishedSpec(), { width: 900, height: 480 });
    const labelY = Number(
      svg.match(/<text[^>]*\by="([\d.]+)"[^>]*>Medieval warm period<\/text>/)?.[1],
    );
    expect(Number.isFinite(labelY), "epoch name text has a y").toBe(true);
    const bandTops = ["#f5edc4", "#dce8f2", "#f3dcda"].map((fill) => {
      const tag = svg.match(new RegExp(`<rect[^>]*fill="${fill}"[^>]*>`))?.[0] ?? "";
      return Number(tag.match(/\by="([\d.]+)"/)?.[1]);
    });
    expect(bandTops.every((top) => Number.isFinite(top))).toBe(true);
    for (const top of bandTops) {
      expect(labelY, `label y ${String(labelY)} vs band top ${String(top)}`).toBeLessThan(top);
    }
  });

  it("states the record as well as the claim, with a middle dot", () => {
    for (const record of SAKURA_RECORDS) {
      expect(record.label, record.label).toContain(" · ");
      expect(record.label, record.label).not.toContain("—");
      // A callout asserting significance without the value makes the reader
      // hunt for the number the annotation exists to deliver.
      expect(record.label, record.label).toMatch(/\b(March|April|May) \d{1,2}\b/);
    }
  });

  it("keeps every leader on the far side of its own label", () => {
    // There is no text repel (#727 gap B), so these positions are hand-computed
    // against a layout nobody can see — the exact condition that let leaders
    // cross their text before. Anchoring at the end only works while every
    // label stays left of the point it names; this is what pins that.
    for (const record of SAKURA_RECORDS) {
      expect(record.labelYear, record.label).toBeLessThan(record.year);
    }
    const callouts = (
      finishedSpec() as { layers: { geom: string; params?: Record<string, unknown> }[] }
    ).layers
      .filter((layer) => layer.geom === "text")
      .map((layer) => layer.params?.["anchor"]);
    expect(callouts).toContain("end");
  });

  it("draws a baseline strong enough to read without caption chrome", () => {
    const spec = finishedSpec() as {
      layers: { geom: string; params?: Record<string, unknown> }[];
      labs?: { caption?: string; title?: string; subtitle?: string };
    };
    const rule = spec.layers.find(
      (layer) => layer.geom === "rule" && layer.params?.["yintercept"] === SAKURA_BASELINE,
    );
    expect(rule).toBeDefined();
    expect(rule?.params?.["linewidth"]).toBeGreaterThanOrEqual(1);
    // Caption/title/subtitle would squash the data panel; citation lives on
    // the page footnote instead (GettingStartedGuide).
    expect(spec.labs?.caption).toBeUndefined();
    expect(spec.labs?.title).toBeUndefined();
    expect(spec.labs?.subtitle).toBeUndefined();
  });
});

/** Mean absolute step between consecutive y positions (screen px). */
const meanYStep = (positions: ArrayLike<number>) => {
  let sum = 0;
  const n = positions.length / 2;
  for (let i = 1; i < n; i += 1)
    sum += Math.abs(positions[i * 2 + 1]! - positions[(i - 1) * 2 + 1]!);
  return sum / (n - 1);
};

describe("gate G4 — the rolling-median trend", () => {
  it("draws one window median per observation year, joined linearly", () => {
    // foldSakura(1): theme + trend + chartlines + y-tick polish (finished reading order for signal).
    const model = runPipeline(foldSakura(1, rows).spec, { width: 900, height: 360 });
    const trend = model.scene.batches.find((batch) => batch.kind === "paths");
    expect(trend).toBeDefined();
    expect(trend!.curve).toBe("linear");
    const vertices = trend!.positions.length / 2;
    // summary_rolling emits one row per unique x — the whole series, not a
    // binned decimation.
    expect(vertices).toBe(new Set(rows.map((row) => row.year)).size);
    // And it is smoother than the raw series it summarizes: the average
    // year-to-year vertical step of the line sits well under the points'.
    const points = model.scene.batches.find((batch) => batch.kind === "points");
    expect(points).toBeDefined();
    expect(meanYStep(trend!.positions)).toBeLessThan(meanYStep(points!.positions) / 2);
  });

  it("reads as one signal: flat for a millennium, then early", () => {
    const model = runPipeline(foldSakura(1, rows).spec, { width: 900, height: 360 });
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
    const folded = foldSakura(2, rows);
    const epochs = folded.spec.layers.find((layer) => layer.geom === "rect");
    expect(epochs?.data).toEqual({ values: SAKURA_EPOCHS });
    expect(folded.source).toContain("year: 950, until: 1250");
    expect(folded.source).toContain("year: 1300, until: 1850");
    // Bands claim climate periods, not the extent of the record.
    expect(folded.source).not.toContain("year: 812");
  });
});

describe("gate G6 — finished chart panel aspect, not outer SVG aspect", () => {
  it("keeps the data panel near 2.5:1 after axis chrome (no title/caption)", () => {
    // Outer height targets the panel: PR #1073 set outer 2.5:1 and crushed the
    // panel to ~5.8:1. Assert the panel at several widths. Finished lesson has
    // no title/subtitle/caption so chrome is axis titles only.
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

/** Layer lookup by inline data values — not by geom (finished fold has two rules). */
function layerWithValues(layers: readonly { data?: unknown }[], values: unknown): number {
  return layers.findIndex((layer) => {
    const data = layer.data;
    if (data === undefined || typeof data !== "object" || data === null) return false;
    if (!("values" in data)) return false;
    return data.values === values;
  });
}

/**
 * #1068: epoch bands are labelled decoration. Without `inspect: false` a
 * full-panel rect reports distance 0 for any pointer inside it, so nearest
 * never reaches a bloom observation or the trend — the two things the chart
 * is about. #1065 shipped the opt-out; this gate keeps the lesson using it.
 */
describe("gate G7 — epoch bands never capture inspection (#1068)", () => {
  const size = { width: 900, height: 480 } as const;
  const epochStep = SAKURA_STEPS[1]!;

  it("opts epochs out of inspection in the step delta", () => {
    expect(epochStep.id).toBe("add-epoch-bands");
    const layers = epochStep.spec.layers as { epochs?: { inspect?: false } } | undefined;
    expect(layers?.epochs?.inspect).toBe(false);
  });

  it("folds inspect: false onto the decorative epoch layers from the step that introduces them", () => {
    // foldSakura(2) = first two steps; step 1 is add-epoch-bands.
    const folded = foldSakura(2, rows);
    const epochs = folded.spec.layers[layerWithValues(folded.spec.layers, SAKURA_EPOCHS)];
    expect(epochs?.geom).toBe("rect");
    expect(epochs?.inspect).toBe(false);
    const names = folded.spec.layers.find(
      (layer) => layer.geom === "text" && layer.inspect === false,
    );
    expect(names).toBeDefined();
  });

  it("prints inspect={false} in the fragment and the folded source the reader copies", () => {
    // Force the source/fragment red first; the component-prop whitelist is
    // widened only after this assertion would otherwise fail for the right reason.
    expect(epochStep.fragment).toContain("inspect={false}");
    const folded = foldSakura(2, rows);
    expect(folded.source).toContain("inspect={false}");
    expect(folded.source).toMatch(/<GeomRect[\s\S]*?inspect=\{false\}/);
    expect(folded.source).toMatch(/<GeomText[\s\S]*?inspect=\{false\}/);
    // Decorative epoch edge rules were removed — they only fought gridlines.
    expect(folded.source).not.toContain("epochEdges");
  });

  for (const annotations of [true, false] as const) {
    const label = annotations ? "wide (with callouts)" : "narrow (annotations dropped)";

    it(`keeps decorative layers out of candidates on the ${label} finished chart`, () => {
      // GettingStartedGuide folds with { annotations: !narrowChart }; layer
      // indexes differ (7 vs 5), so both variants must pass.
      const folded = foldSakura(SAKURA_STEPS.length, rows, { annotations });
      const model = runPipeline(folded.spec, size);
      const layers = folded.spec.layers;

      const epochIndex = layerWithValues(layers, SAKURA_EPOCHS);
      expect(epochIndex, "epochs layer present").toBeGreaterThanOrEqual(0);
      expect(layers[epochIndex]!.geom).toBe("rect");

      for (let id = 0; id < model.candidates.size; id += 1) {
        const candidate = model.candidates.candidate(id);
        if (candidate === null) continue;
        expect(candidate.layerIndex).not.toBe(epochIndex);
      }
    });

    it(`lets nearest on an observation reach the points layer on the ${label} chart`, () => {
      const folded = foldSakura(SAKURA_STEPS.length, rows, { annotations });
      const model = runPipeline(folded.spec, size);
      const layers = folded.spec.layers;
      const pointIndex = layers.findIndex((layer) => layer.geom === "point");
      const epochIndex = layerWithValues(layers, SAKURA_EPOCHS);
      expect(pointIndex).toBeGreaterThanOrEqual(0);

      // Late-record observations: an on-mark probe must return the bloom point
      // (year + date), not a band. Off-mark exact returns null after opt-out —
      // do not expect a substitute point at panel center.
      //
      // Not every observation answers as the point. The median trend line is a
      // stepped stroke drawn over the points, and topmost-hit gives it the
      // observations it covers. So this asserts what the gate is for: SOME
      // observation is reachable, and the epoch band is NEVER the answer.
      const probes: { x: number; y: number; year: number; date: string }[] = [];
      for (let id = 0; id < model.candidates.size; id += 1) {
        const candidate = model.candidates.candidate(id);
        if (candidate === null || candidate.layerIndex !== pointIndex) continue;
        if (typeof candidate.xValue !== "number") continue;
        if (candidate.xValue < 1995 || candidate.xValue > 2005) continue;
        if (typeof candidate.yValue !== "string") continue;
        probes.push({
          x: candidate.x,
          y: candidate.y,
          year: candidate.xValue,
          date: candidate.yValue,
        });
      }
      expect(probes.length, "expected point candidates near year 2000").toBeGreaterThan(0);

      let reached = 0;
      for (const probe of probes) {
        const hit = model.candidates.nearest(probe.x, probe.y, {
          mode: "exact",
          maxDistance: 24,
        });
        expect(hit).not.toBeNull();
        // The band never wins on a mark, whichever layer does.
        expect(hit!.layerIndex).not.toBe(epochIndex);
        // Band geometry columns must not leak through the winning candidate.
        expect(hit!.xValue).not.toBe("top");
        expect(String(hit!.yValue)).not.toMatch(/^(top|bottom|until)$/);
        if (hit!.layerIndex !== pointIndex) continue;
        expect(hit!.xValue).toBe(probe.year);
        expect(hit!.yValue).toBe(probe.date);
        reached += 1;
      }
      expect(reached, "expected an observation to answer as the points layer").toBeGreaterThan(0);

      // Empty space used to answer as the band (distance 0). After opt-out,
      // exact mode returns nothing off-mark — or at least never the band.
      const empty = model.candidates.nearest(size.width / 2, size.height / 2, {
        mode: "exact",
        maxDistance: size.width,
      });
      if (empty !== null) {
        expect(empty.layerIndex).not.toBe(epochIndex);
      }
    });
  }
});

describe("gate G9 — epoch bands encompass every observation", () => {
  it("sets band top early enough that every bloom sits inside the fill", () => {
    // Earliest bloom in the record is 25 March. Band top stays at 18 March so
    // those points sit inside the rect; domain top is earlier still (name strip).
    for (const band of SAKURA_EPOCHS) {
      expect(band.top).toBe("03-18");
      expect(band.bottom).toBe("05-10");
    }
  });
});
