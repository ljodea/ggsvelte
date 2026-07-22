/**
 * Pure unit tests for intervalPixelsFromDomains and bandDomainValuesFromKeys.
 */
import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";

import { encodeKey } from "@ggsvelte/core";

import {
  bandDomainValuesFromKeys,
  intervalPixelsFromDomains,
  type IntervalQueryScene,
} from "../../src/lib/interval/query.js";

describe("intervalPixelsFromDomains", () => {
  const panel = { x: 10, y: 20, width: 100, height: 200 };
  const linearScales = fromPartial<IntervalQueryScene["scales"]>({
    x: { type: "linear", normalize: (v: number) => v / 10 },
    y: { type: "linear", normalize: (v: number) => v / 20 },
  });
  const bandRaw = ["a", "b", "c", "d"] as const;
  const bandScale = {
    type: "band",
    domain: ["a", "b", "c", "d"],
    rawDomain: bandRaw,
    indexOf: (value: unknown) => {
      const i = bandRaw.findIndex((candidate) => Object.is(candidate, value));
      return i < 0 ? undefined : i;
    },
    normalize: (value: unknown) => {
      const i = bandRaw.findIndex((candidate) => Object.is(candidate, value));
      return i < 0 ? undefined : (i + 0.5) / bandRaw.length;
    },
    step: 0.25,
  };

  it("maps continuous domains through normalize on both axes", () => {
    expect(
      intervalPixelsFromDomains({
        domains: {
          x: { kind: "linear", domain: [2, 6] },
          y: { kind: "linear", domain: [5, 10] },
        },
        panel,
        scales: linearScales,
        flipped: false,
      }),
    ).toEqual({ x0: 30, y0: 120, x1: 70, y1: 170 });
  });

  it("re-projects semantic domains through the panel coordinate projector", () => {
    const pixels = intervalPixelsFromDomains({
      domains: { x: { kind: "linear", domain: [10, 100] } },
      panel,
      scales: fromPartial<IntervalQueryScene["scales"]>({
        ...linearScales,
        x: { type: "linear", normalize: (value: number) => value / 1000 },
      }),
      coord: {
        x: {
          invertFraction: (fraction: number) => fraction,
          projectFraction: (fraction: number) => Math.log10(fraction * 1000) / 3,
        },
        y: {
          invertFraction: (fraction: number) => fraction,
          projectFraction: (fraction: number) => fraction,
        },
      },
      flipped: false,
    });
    expect(pixels.x0).toBeCloseTo(10 + 100 / 3, 10);
    expect(pixels.x1).toBeCloseTo(10 + 200 / 3, 10);
    expect(pixels.y0).toBe(20);
    expect(pixels.y1).toBe(220);
  });

  it("spans the full panel on the unconstrained axis", () => {
    expect(
      intervalPixelsFromDomains({
        domains: { x: { kind: "linear", domain: [2, 6] } },
        panel,
        scales: linearScales,
        flipped: false,
      }),
    ).toEqual({ x0: 30, y0: 20, x1: 70, y1: 220 });
  });

  it("covers selected band categories edge to edge", () => {
    expect(
      intervalPixelsFromDomains({
        domains: { x: { kind: "band", values: ["b", "c"] } },
        panel,
        scales: fromPartial<IntervalQueryScene["scales"]>({ ...linearScales, x: bandScale }),
        flipped: false,
      }),
    ).toEqual({ x0: 35, y0: 20, x1: 85, y1: 220 });
  });

  it("mirrors reversed band scales through normalize", () => {
    const reversed = {
      ...bandScale,
      normalize: (value: unknown) => {
        const i = bandRaw.findIndex((candidate) => Object.is(candidate, value));
        return i < 0 ? undefined : 1 - (i + 0.5) / bandRaw.length;
      },
    };
    expect(
      intervalPixelsFromDomains({
        domains: { x: { kind: "band", values: ["a"] } },
        panel,
        scales: fromPartial<IntervalQueryScene["scales"]>({ ...linearScales, x: reversed }),
        flipped: false,
      }),
    ).toEqual({ x0: 85, y0: 20, x1: 110, y1: 220 });
  });

  it("swaps channels under coord flip", () => {
    expect(
      intervalPixelsFromDomains({
        domains: {
          x: { kind: "linear", domain: [2, 6] },
          y: { kind: "linear", domain: [5, 10] },
        },
        panel,
        scales: linearScales,
        flipped: true,
      }),
    ).toEqual({ x0: 35, y0: 100, x1: 60, y1: 180 });
  });

  it("falls back to the full panel for unmappable domains", () => {
    expect(
      intervalPixelsFromDomains({
        domains: { x: { kind: "band", values: ["missing"] } },
        panel,
        scales: fromPartial<IntervalQueryScene["scales"]>({ ...linearScales, x: bandScale }),
        flipped: false,
      }),
    ).toEqual({ x0: 10, y0: 20, x1: 110, y1: 220 });
    expect(
      intervalPixelsFromDomains({
        domains: { y: { kind: "band", values: ["a"] } },
        panel,
        scales: linearScales,
        flipped: false,
      }),
    ).toEqual({ x0: 10, y0: 20, x1: 110, y1: 220 });
  });

  it("resolves encodeKey tokens against typed rawDomain values", () => {
    // Production stores encoded identities (encodeKey), not display labels.
    // 1 vs "1" must not collide — only the numeric band is selected.
    const typedRaw = [1, "1", true] as const;
    const typedScale = {
      type: "band",
      domain: ["1", "1", "true"],
      rawDomain: typedRaw,
      indexOf: (value: unknown) => {
        const i = typedRaw.findIndex((candidate) => Object.is(candidate, value));
        return i < 0 ? undefined : i;
      },
      normalize: (value: unknown) => {
        const i = typedRaw.findIndex((candidate) => Object.is(candidate, value));
        return i < 0 ? undefined : (i + 0.5) / typedRaw.length;
      },
      step: 1 / 3,
    };
    // Centers at 1/6 and 5/6; half-step = 1/6 → span [0, 1] on the panel width.
    expect(
      intervalPixelsFromDomains({
        domains: {
          x: { kind: "band", values: [encodeKey(1), encodeKey(true)] },
        },
        panel,
        scales: fromPartial<IntervalQueryScene["scales"]>({ ...linearScales, x: typedScale }),
        flipped: false,
      }),
    ).toEqual({ x0: 10, y0: 20, x1: 110, y1: 220 });
    // Single middle category "1" (string): center 0.5 ± half-step.
    const half = (1 / 3 / 2) * panel.width;
    const center = panel.x + 0.5 * panel.width;
    expect(
      intervalPixelsFromDomains({
        domains: { x: { kind: "band", values: [encodeKey("1")] } },
        panel,
        scales: fromPartial<IntervalQueryScene["scales"]>({ ...linearScales, x: typedScale }),
        flipped: false,
      }),
    ).toEqual({
      x0: center - half,
      y0: 20,
      x1: center + half,
      y1: 220,
    });
  });

  // Lookup builds a key→value Map once per scale (O(D) prep + O(V) get), not
  // find over rawDomain per selected value. Structural O(V+D); behavioral
  // coverage at scale lives here (wall-clock ratios flake under CI contention).
  it("projects a large band selection without dropping endpoints", () => {
    const domainSize = 400;
    const rawDomain = Array.from({ length: domainSize }, (_, i) => `cat-${i}`);
    const largeScale = {
      type: "band",
      domain: rawDomain,
      rawDomain,
      indexOf: (value: unknown) => {
        const i = rawDomain.indexOf(value as string);
        return i < 0 ? undefined : i;
      },
      normalize: (value: unknown) => {
        const i = rawDomain.indexOf(value as string);
        return i < 0 ? undefined : (i + 0.5) / domainSize;
      },
      step: 1 / domainSize,
    };
    // Sparse selection: first, middle, last — order of values must not matter
    // for the edge-to-edge span (min/max centers ± half step).
    const selected = [
      encodeKey(`cat-${domainSize - 1}`),
      encodeKey("cat-0"),
      encodeKey(`cat-${Math.floor(domainSize / 2)}`),
    ];
    // First center (0.5/D) − half-step = 0; last center ((D−0.5)/D) + half = 1.
    expect(
      intervalPixelsFromDomains({
        domains: { x: { kind: "band", values: selected } },
        panel,
        scales: fromPartial<IntervalQueryScene["scales"]>({ ...linearScales, x: largeScale }),
        flipped: false,
      }),
    ).toEqual({ x0: 10, y0: 20, x1: 110, y1: 220 });
  });
});

describe("bandDomainValuesFromKeys", () => {
  it("returns typed rawDomain values in selection order via encodeKey", () => {
    const date = new Date("2025-01-02T00:00:00.000Z");
    const rawDomain = [1, "1", true, null, date] as const;
    expect(
      bandDomainValuesFromKeys(rawDomain, [
        encodeKey(true),
        encodeKey(1),
        encodeKey("missing"),
        encodeKey(null),
      ]),
    ).toEqual([true, 1, null]);
  });

  it("keeps the first rawDomain entry when encodeKeys collide", () => {
    // Band domains are normally unique by encodeKey; if they are not, Map
    // indexing must match prior find semantics (first match wins).
    const rawDomain = [0, -0] as const;
    // encodeKey distinguishes -0 from 0, so both resolve; exercise first-wins
    // with a deliberate duplicate key by reusing the same value twice.
    expect(bandDomainValuesFromKeys([0, 0], [encodeKey(0)])).toEqual([0]);
    expect(bandDomainValuesFromKeys(rawDomain, [encodeKey(0), encodeKey(-0)])).toEqual([0, -0]);
  });

  it("returns empty when nothing matches", () => {
    expect(bandDomainValuesFromKeys(["a", "b"], [encodeKey("z")])).toEqual([]);
    expect(bandDomainValuesFromKeys([], [encodeKey("a")])).toEqual([]);
  });
});
