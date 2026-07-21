import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";

import { encodeKey } from "@ggsvelte/core";

import {
  bandDomainValuesFromKeys,
  buildIntervalSelectionFromScene,
  intervalPixelsFromDomains,
  intervalQuerySceneFromModel,
  resolveIntervalQueryParts,
  type IntervalQueryModelPort,
  type IntervalQueryScene,
} from "../../src/lib/interval/query.js";

function scene(partial: {
  panel?: IntervalQueryScene["panel"];
  singlePanel?: boolean;
  flip?: boolean;
  coord?: IntervalQueryScene["coord"];
  candidates?: readonly {
    lineage: number;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }[];
  lineage?: Record<number, number[]>;
}): IntervalQueryScene {
  const panel =
    partial.panel === undefined ? { x: 0, y: 0, width: 100, height: 100, id: "p0" } : partial.panel;
  const candidates = partial.candidates ?? [];
  const lineage = partial.lineage ?? { 1: [10, 11], 2: [11, 12] };
  const flip = partial.flip ?? false;
  return {
    panel,
    singlePanel: partial.singlePanel ?? true,
    flip,
    ...(partial.coord !== undefined && { coord: partial.coord }),
    scales: fromPartial<IntervalQueryScene["scales"]>({
      x: {
        type: "linear",
        invert: (t: number) => (flip ? 1 - t : t) * 10,
      },
      y: {
        type: "linear",
        invert: (t: number) => (flip ? t : 1 - t) * 20,
      },
    }),
    queryCandidates(expanded) {
      // Production uses the hit index; tests approximate with axis-aligned bounds.
      return candidates
        .filter(
          (c) =>
            c.x1 >= expanded.x0 &&
            c.x0 <= expanded.x1 &&
            c.y1 >= expanded.y0 &&
            c.y0 <= expanded.y1,
        )
        .map((c) => ({ lineage: c.lineage }));
    },
    lineageKeys(id) {
      return lineage[id] ?? [];
    },
  };
}

describe("resolveIntervalQueryParts", () => {
  it("returns empty parts when scene or panel is missing", () => {
    expect(
      resolveIntervalQueryParts({
        pixels: { x0: 0, y0: 0, x1: 10, y1: 10 },
        mode: "xy",
        scene: null,
      }),
    ).toEqual({ rowIndexes: new Set(), panelId: null, invertedDomain: {} });

    expect(
      resolveIntervalQueryParts({
        pixels: { x0: 0, y0: 0, x1: 10, y1: 10 },
        mode: "xy",
        scene: scene({ panel: null }),
      }),
    ).toEqual({ rowIndexes: new Set(), panelId: null, invertedDomain: {} });
  });

  it("unions lineage rows for candidates in the expanded query", () => {
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 10, y0: 10, x1: 40, y1: 40 },
      mode: "xy",
      scene: scene({
        candidates: [
          { lineage: 1, x0: 15, y0: 15, x1: 16, y1: 16 },
          { lineage: 2, x0: 20, y0: 20, x1: 21, y1: 21 },
          { lineage: 1, x0: 90, y0: 90, x1: 91, y1: 91 }, // outside
        ],
      }),
    });
    expect([...parts.rowIndexes]).toEqual(expect.arrayContaining([10, 11, 12]));
    expect(parts.rowIndexes.size).toBe(3);
    expect(parts.panelId).toBe("p0");
  });

  it("x-mode expands the orthogonal axis so y-position is ignored", () => {
    // Candidate far in y but inside x span of a thin brush should still match in x-mode.
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 10, y0: 50, x1: 30, y1: 51 },
      mode: "x",
      scene: scene({
        candidates: [{ lineage: 1, x0: 20, y0: 5, x1: 21, y1: 6 }],
      }),
    });
    expect([...parts.rowIndexes]).toEqual([10, 11]);
  });

  it("skips domain invert when not single-panel", () => {
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 0, y0: 0, x1: 50, y1: 50 },
      mode: "xy",
      scene: scene({ singlePanel: false }),
    });
    expect(parts.invertedDomain).toEqual({});
  });

  it("uses the requested facet panel identity and its local scales", () => {
    const base = scene({ singlePanel: false });
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 110, y0: 0, x1: 150, y1: 50 },
      mode: "xy",
      panelId: "panel:east",
      scene: {
        ...base,
        panels: [
          {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            id: "panel:west",
            scales: base.scales,
          },
          {
            x: 100,
            y: 0,
            width: 100,
            height: 100,
            id: "panel:east",
            scales: fromPartial<IntervalQueryScene["scales"]>({
              x: { type: "linear", invert: (t: number) => 100 + t * 100 },
              y: { type: "linear", invert: (t: number) => 1000 - t * 1000 },
            }),
          },
        ],
      },
    });

    expect(parts.panelId).toBe("panel:east");
    expect(parts.invertedDomain.x).toEqual([110, 150]);
    expect(parts.invertedDomain.y).toEqual([0, 500]);
  });

  it("inverts the coordinate projector before continuous interval scales", () => {
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 50, y0: 0, x1: 100, y1: 100 },
      mode: "x",
      scene: scene({
        coord: {
          x: { invertFraction: (fraction: number) => fraction * fraction },
          y: { invertFraction: (fraction: number) => fraction },
        },
      }),
    });
    expect(parts.invertedDomain.x).toEqual([2.5, 10]);
  });

  it("returns inclusive band endpoints for categorical interval selection", () => {
    const base = scene({});
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 20, y0: 0, x1: 70, y1: 100 },
      mode: "x",
      scene: {
        ...base,
        scales: {
          ...base.scales,
          x: {
            type: "band",
            domain: ["a", "b", "c", "d"],
            rawDomain: ["a", "b", "c", "d"],
            indexOf: () => {},
            normalize: () => {},
            step: 0.25,
          },
        },
      },
    });
    expect(parts.invertedDomain.x).toEqual(["a", "c"]);
  });

  it("honors reversed band scales when inverting brush bounds", () => {
    const base = scene({});
    const rawDomain = ["a", "b", "c", "d"] as const;
    const parts = resolveIntervalQueryParts({
      // Screen fractions [0.2, 0.7]; with reverse the domain runs right-to-
      // left, so the brushed categories are the mirrored [0.3, 0.8] → b..d.
      pixels: { x0: 20, y0: 0, x1: 70, y1: 100 },
      mode: "x",
      scene: {
        ...base,
        scales: {
          ...base.scales,
          x: {
            type: "band",
            domain: ["a", "b", "c", "d"],
            rawDomain,
            indexOf: (value: unknown) =>
              rawDomain.findIndex((candidate) => Object.is(candidate, value)),
            normalize: (value: unknown) => {
              const i = rawDomain.findIndex((candidate) => Object.is(candidate, value));
              return i < 0 ? undefined : 1 - (i + 0.5) / rawDomain.length;
            },
            step: 0.25,
          },
        },
      },
    });
    expect(parts.invertedDomain.x).toEqual(["b", "d"]);
  });

  it("returns raw typed band endpoints instead of colliding display labels", () => {
    const base = scene({});
    const date = new Date("2025-01-02T00:00:00.000Z");
    const rawDomain = [1, "1", true, null, date] as const;
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 0, y0: 0, x1: 39, y1: 100 },
      mode: "x",
      scene: {
        ...base,
        scales: {
          ...base.scales,
          x: {
            type: "band",
            domain: ["1", "1", "true", "(null)", date.toISOString()],
            rawDomain,
            indexOf: (value: unknown) =>
              rawDomain.findIndex((candidate) => Object.is(candidate, value)),
            normalize: () => {},
            step: 0.2,
          },
        },
      },
    });

    expect(parts.invertedDomain.x).toEqual([1, "1"]);
  });
});

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

describe("buildIntervalSelectionFromScene", () => {
  it("builds a frozen end event with mode-filtered domain and keys", () => {
    const event = buildIntervalSelectionFromScene({
      phase: "end",
      mode: "x",
      source: "pointer",
      pixels: { x0: 0, y0: 0, x1: 50, y1: 50 },
      scene: scene({
        candidates: [{ lineage: 1, x0: 10, y0: 10, x1: 11, y1: 11 }],
      }),
      keyForRow: (rowIndex) => (rowIndex === 11 ? null : `r${String(rowIndex)}`),
    });
    expect(event.phase).toBe("end");
    expect(event.mode).toBe("x");
    expect(event.panelId).toBe("p0");
    expect(event.keys).toEqual(["r10"]);
    expect(event.lineageCount).toBe(2);
    expect(event.domain.x).toBeDefined();
    expect(event.domain.y).toBeUndefined();
    expect(Object.isFrozen(event)).toBe(true);
  });

  it("preserves start phase with empty scene", () => {
    const event = buildIntervalSelectionFromScene({
      phase: "start",
      mode: "xy",
      source: "keyboard",
      pixels: { x0: 1, y0: 2, x1: 3, y1: 4 },
      scene: null,
      keyForRow: () => "k",
    });
    expect(event).toMatchObject({
      phase: "start",
      keys: [],
      lineageCount: 0,
      panelId: null,
      source: "keyboard",
    });
  });
});

describe("intervalQuerySceneFromModel", () => {
  const scales = fromPartial<IntervalQueryScene["scales"]>({
    x: { type: "linear", invert: (t: number) => t * 10 },
    y: { type: "linear", invert: (t: number) => (1 - t) * 20 },
  });

  function port(partial: {
    panels?: IntervalQueryModelPort["scene"]["panels"];
    byId?: Record<number, { lineage: number } | null>;
    lineage?: Record<number, number[]>;
    onQueryRect?: (x0: number, y0: number, x1: number, y1: number) => void;
  }): IntervalQueryModelPort {
    const byId = partial.byId ?? {
      0: { lineage: 1 },
      1: null,
      2: { lineage: 2 },
    };
    const lineage = partial.lineage ?? { 1: [10], 2: [20, 21] };
    return {
      scene: {
        panels: partial.panels ?? [{ x: 1, y: 2, width: 30, height: 40, id: "p0" }],
      },
      scales,
      candidates: {
        queryRect(x0, y0, x1, y1) {
          partial.onQueryRect?.(x0, y0, x1, y1);
          return Object.keys(byId).map(Number);
        },
        candidate(id) {
          return byId[id] ?? null;
        },
      },
      lineage: {
        keys(lineageId) {
          return lineage[lineageId] ?? [];
        },
      },
    };
  }

  it("maps first panel geometry and singlePanel from panel count", () => {
    const one = intervalQuerySceneFromModel(port({}), false);
    expect(one.panel).toEqual({ x: 1, y: 2, width: 30, height: 40, id: "p0" });
    expect(one.singlePanel).toBe(true);
    expect(one.flip).toBe(false);
    expect(one.scales).toBe(scales);

    const multi = intervalQuerySceneFromModel(
      port({
        panels: [
          { x: 0, y: 0, width: 10, height: 10, id: "a" },
          { x: 10, y: 0, width: 10, height: 10, id: "b" },
        ],
      }),
      true,
    );
    expect(multi.panel?.id).toBe("a");
    expect(multi.singlePanel).toBe(false);
    expect(multi.flip).toBe(true);
  });

  it("returns null panel when the model has no panels", () => {
    const empty = intervalQuerySceneFromModel(port({ panels: [] }), false);
    expect(empty.panel).toBeNull();
    expect(empty.singlePanel).toBe(false);
  });

  it("queryCandidates forwards expanded bounds, filters nulls, and lineageKeys delegates", () => {
    const seen: number[][] = [];
    const adapted = intervalQuerySceneFromModel(
      port({
        onQueryRect(x0, y0, x1, y1) {
          seen.push([x0, y0, x1, y1]);
        },
      }),
      false,
    );
    expect(adapted.queryCandidates({ x0: 3, y0: 4, x1: 5, y1: 6 })).toEqual([
      { lineage: 1 },
      { lineage: 2 },
    ]);
    expect(seen).toEqual([[3, 4, 5, 6]]);
    expect([...adapted.lineageKeys(2)]).toEqual([20, 21]);
    expect([...adapted.lineageKeys(99)]).toEqual([]);
  });

  it("wires through resolveIntervalQueryParts for lineage rows", () => {
    const adapted = intervalQuerySceneFromModel(
      port({
        byId: { 0: { lineage: 1 } },
        lineage: { 1: [5, 6] },
      }),
      false,
    );
    // queryRect returns all byId keys; expanded geometry unused by stub.
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 0, y0: 0, x1: 50, y1: 50 },
      mode: "xy",
      scene: adapted,
    });
    expect([...parts.rowIndexes]).toEqual([5, 6]);
    expect(parts.panelId).toBe("p0");
  });
});
