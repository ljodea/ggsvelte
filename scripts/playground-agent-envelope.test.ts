import { describe, expect, test } from "bun:test";

import {
  chartHasDiscreteLegend,
  coerceInteractionsForChart,
  defaultPlaygroundInteractions,
  normalizePlaygroundInteractions,
  parsePlaygroundAgentEnvelope,
  stripMarkdownFences,
} from "../apps/docs/src/lib/playground-agent-envelope";

describe("playground agent envelope", () => {
  test("strips markdown fences", () => {
    expect(stripMarkdownFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  test("parses a full envelope and normalizes interactions", () => {
    const result = parsePlaygroundAgentEnvelope({
      spec: { edition: 1, data: { name: "penguins" }, layers: [] },
      interactions: { inspect: true, select: "interval", zoom: true, legendFilter: true },
      title: "Hello",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // interval XOR zoom — interval wins
    expect(result.envelope.interactions.zoom).toBe(false);
    expect(result.envelope.interactions.select).toBe("interval");
    expect(result.envelope.title).toBe("Hello");
  });

  test("rejects garbage and Svelte source", () => {
    expect(parsePlaygroundAgentEnvelope("not json").ok).toBe(false);
    expect(parsePlaygroundAgentEnvelope("<GGPlot {spec} />\nimport { GGPlot } from 'x'").ok).toBe(
      false,
    );
  });

  test("defaults missing interactions", () => {
    expect(normalizePlaygroundInteractions()).toEqual(defaultPlaygroundInteractions());
    expect(normalizePlaygroundInteractions({ select: true }).select).toBe("point");
  });

  test("detects discrete legend and coerces legend toggles", () => {
    const withLegend = {
      layers: [{ geom: "point", aes: { color: { field: "species" } } }],
    };
    expect(chartHasDiscreteLegend(withLegend)).toBe(true);
    const coerced = coerceInteractionsForChart(
      {
        inspect: true,
        select: false,
        zoom: false,
        legendFilter: true,
        legendFocus: true,
      },
      false,
    );
    expect(coerced.legendFilter).toBe(false);
    expect(coerced.legendFocus).toBe(false);
  });

  // A quantitative colour channel renders a colourbar, which has nothing to
  // filter or focus — but the invitation line still promised legend filtering
  // because only field *presence* was checked (#697).
  test("continuous colour channels do not enable legend filter/focus", () => {
    const rows = [
      { species: "Adelie", mass: 3750, date: "2024-01-01" },
      { species: "Gentoo", mass: 5200, date: "2024-02-01" },
    ];
    const quantitative = {
      data: { values: rows },
      layers: [{ geom: "point", aes: { color: { field: "mass" } } }],
    };
    expect(chartHasDiscreteLegend(quantitative)).toBe(false);

    const temporal = {
      data: { values: rows },
      layers: [{ geom: "point", aes: { color: { field: "date" } } }],
    };
    expect(chartHasDiscreteLegend(temporal)).toBe(false);

    const discrete = {
      data: { values: rows },
      layers: [{ geom: "point", aes: { color: { field: "species" } } }],
    };
    expect(chartHasDiscreteLegend(discrete)).toBe(true);

    const coerced = coerceInteractionsForChart(
      {
        inspect: true,
        select: false,
        zoom: false,
        legendFilter: true,
        legendFocus: true,
      },
      chartHasDiscreteLegend(quantitative),
    );
    expect(coerced.legendFilter).toBe(false);
    expect(coerced.legendFocus).toBe(false);
  });

  test("column-oriented data is read for the same decision", () => {
    const columns = {
      data: { columns: { region: ["North", "South"], amount: [12, 40] } },
      layers: [{ geom: "bar", aes: { fill: { field: "amount" } } }],
    };
    expect(chartHasDiscreteLegend(columns)).toBe(false);
    expect(
      chartHasDiscreteLegend({
        data: { columns: { region: ["North", "South"], amount: [12, 40] } },
        layers: [{ geom: "bar", aes: { fill: { field: "region" } } }],
      }),
    ).toBe(true);
  });

  test("the configured colour scale family outranks the data", () => {
    const rows = [
      { grade: 1, label: "a" },
      { grade: 2, label: "b" },
    ];
    // Numbers, but authored as categories → discrete legend.
    expect(
      chartHasDiscreteLegend({
        data: { values: rows },
        scales: { color: { type: "ordinal" } },
        layers: [{ geom: "point", aes: { color: { field: "grade" } } }],
      }),
    ).toBe(true);
    // Strings, but authored as a ramp/steps → colourbar or colour steps.
    for (const type of ["sequential", "binned"] as const) {
      expect(
        chartHasDiscreteLegend({
          data: { values: rows },
          scales: { fill: { type } },
          layers: [{ geom: "bar", aes: { fill: { field: "label" } } }],
        }),
      ).toBe(false);
    }
    // A sequential scheme implies the same family without an explicit type.
    expect(
      chartHasDiscreteLegend({
        data: { values: rows },
        scales: { color: { scheme: "viridis" } },
        layers: [{ geom: "point", aes: { color: { field: "label" } } }],
      }),
    ).toBe(false);
  });

  test("an unresolvable colour field keeps the legend affordance", () => {
    // No data to profile: the runtime may still draw a discrete legend, so the
    // toggles stay available rather than silently disappearing.
    expect(
      chartHasDiscreteLegend({
        layers: [{ geom: "point", aes: { color: { field: "species" } } }],
      }),
    ).toBe(true);
    expect(
      chartHasDiscreteLegend({
        data: { values: [{ species: "Adelie" }] },
        layers: [{ geom: "point", aes: { color: { field: "absent" } } }],
      }),
    ).toBe(true);
  });

  test("layer-local data profiles the layer's own colour field", () => {
    expect(
      chartHasDiscreteLegend({
        data: { values: [{ species: "Adelie" }] },
        layers: [
          {
            geom: "point",
            data: { values: [{ mass: 3750 }, { mass: 5200 }] },
            aes: { color: { field: "mass" } },
          },
        ],
      }),
    ).toBe(false);
  });

  test("constant colour is not a legend channel", () => {
    expect(
      chartHasDiscreteLegend({
        data: { values: [{ mass: 1 }] },
        layers: [{ geom: "point", aes: { color: { value: "steelblue" } } }],
      }),
    ).toBe(false);
  });

  test("caps title length and strips control characters", () => {
    const result = parsePlaygroundAgentEnvelope({
      spec: { layers: [], data: { values: [] } },
      title: `ab\u0000${"x".repeat(200)}`,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.title?.length).toBeLessThanOrEqual(120);
    expect(result.envelope.title).not.toContain("\u0000");
  });
});
