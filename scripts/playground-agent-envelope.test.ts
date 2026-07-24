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
    expect(normalizePlaygroundInteractions(undefined)).toEqual(defaultPlaygroundInteractions());
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
