import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, test } from "bun:test";
import {
  adoptScaleState,
  paletteFingerprint,
  PaletteExhaustedError,
  serializeScaleState,
  trainDiscrete,
  type DiscreteScaleSpec,
  type ScaleState,
} from "../src/scales/state.ts";

const COLORS = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"] as const;

const spec = (over: Partial<DiscreteScaleSpec> = {}): DiscreteScaleSpec => ({
  type: "ordinal",
  range: COLORS,
  ...over,
});

const colorMap = (values: unknown[], r: ReturnType<typeof trainDiscrete>) =>
  new Map(values.map((v) => [v, r.rangeValueOf(v)]));

describe("palette fingerprint", () => {
  test("same color values in a fresh array do NOT invalidate", () => {
    const a = paletteFingerprint({ type: "ordinal", range: ["#111", "#222"] });
    const b = paletteFingerprint({ type: "ordinal", range: ["#111", "#222"].slice() });
    expect(a).toBe(b);
  });

  test("changed range values, scheme name, or scale type DO invalidate", () => {
    const base = paletteFingerprint({ type: "ordinal", range: ["#111", "#222"] });
    expect(paletteFingerprint({ type: "ordinal", range: ["#111", "#333"] })).not.toBe(base);
    expect(paletteFingerprint({ type: "band", range: ["#111", "#222"] })).not.toBe(base);
    const s1 = paletteFingerprint({ type: "ordinal", range: ["#111", "#222"], scheme: "set1" });
    const s2 = paletteFingerprint({ type: "ordinal", range: ["#111", "#222"], scheme: "set2" });
    expect(s1).not.toBe(s2);
    expect(s1).not.toBe(base);
  });

  test("scheme name wins over range identity: re-resolved scheme array is stable", () => {
    const a = paletteFingerprint({ type: "ordinal", range: ["#111", "#222"], scheme: "set1" });
    const b = paletteFingerprint({ type: "ordinal", range: ["#aaa", "#bbb"], scheme: "set1" });
    expect(a).toBe(b);
  });

  test("adjacent range strings do not smear together (length-prefixed)", () => {
    const a = paletteFingerprint({ type: "ordinal", range: ["ab", "c"] });
    const b = paletteFingerprint({ type: "ordinal", range: ["a", "bc"] });
    expect(a).not.toBe(b);
  });
});

describe("grow mode: value stability", () => {
  test("add / remove / re-add: a returning series gets its old color", () => {
    const r1 = trainDiscrete(["a", "b", "c"], spec());
    const colorB = r1.rangeValueOf("b");

    // remove 'b' — everything else keeps its color, 'b' stays in state
    const r2 = trainDiscrete(["a", "c"], spec(), r1.state);
    expect(r2.rangeValueOf("a")).toBe(r1.rangeValueOf("a"));
    expect(r2.rangeValueOf("c")).toBe(r1.rangeValueOf("c"));
    expect(r2.state.assignments.length).toBe(3); // removed value retained
    expect(r2.domain).toEqual(["a", "c"]); // but not in the present domain

    // re-add 'b' plus a brand-new 'd'
    const r3 = trainDiscrete(["a", "c", "b", "d"], spec(), r2.state);
    expect(r3.rangeValueOf("b")).toBe(colorB); // old color restored
    expect(r3.indexOf("d")).toBe(3); // new value gets the next index
    expect(r3.warnings).toEqual([]);
  });

  test("assignments are keyed by value, not position: sorting the data never reassigns", () => {
    const r1 = trainDiscrete(["banana", "apple", "cherry"], spec());
    const r2 = trainDiscrete(["apple", "banana", "cherry"].toSorted(), spec(), r1.state);
    for (const v of ["banana", "apple", "cherry"]) {
      expect(r2.rangeValueOf(v)).toBe(r1.rangeValueOf(v));
    }
    // display order may differ; assignment (state) is identical
    expect(r2.state.assignments).toEqual(r1.state.assignments);
  });

  test("alphabetical-insertion-order independence: earlier values keep colors when a lexically-smaller value arrives", () => {
    const r1 = trainDiscrete(["zebra", "yak"], spec());
    const r2 = trainDiscrete(["aardvark", "zebra", "yak"], spec(), r1.state);
    expect(r2.rangeValueOf("zebra")).toBe(r1.rangeValueOf("zebra"));
    expect(r2.rangeValueOf("yak")).toBe(r1.rangeValueOf("yak"));
    expect(r2.indexOf("aardvark")).toBe(2); // appended, not sorted to the front
  });

  test("cross-type values are distinct series: 1, '1', true, null, NaN, -0, a Date", () => {
    const values = [1, "1", true, null, NaN, -0, new Date(0)];
    const r = trainDiscrete(values, spec({ range: [0, 1, 2, 3, 4, 5, 6] }));
    const indices = values.map((v) => r.indexOf(v));
    expect(new Set(indices).size).toBe(values.length);
    expect(r.indexOf(NaN)).toBe(r.indexOf(NaN)); // NaN is a stable key
    expect(r.indexOf(-0)).not.toBe(r.indexOf(0));
  });

  test("data mode (legacy) rebuilds per render and ignores prior state", () => {
    const r1 = trainDiscrete(["a", "b"], spec({ domainMode: "data" }));
    const r2 = trainDiscrete(["b", "c"], spec({ domainMode: "data" }), r1.state);
    expect(r2.indexOf("b")).toBe(0); // reassigned — the exact bug 'grow' fixes
    expect(r2.indexOf("c")).toBe(1);
    expect(r2.indexOf("a")).toBeUndefined();
    expect(r2.mode).toBe("data");
  });
});

describe("persistence round-trip", () => {
  test("train -> JSON.stringify -> adopt -> retrain gives identical colors and state", () => {
    const data = ["a", "b", NaN, new Date(0), "@n:1", 1];
    const r1 = trainDiscrete(data, spec({ range: [10, 20, 30, 40, 50, 60] }));

    const restored = adoptScaleState(serializeScaleState(r1.state));
    expect(restored).toEqual(r1.state);

    const r2 = trainDiscrete(data, spec({ range: [10, 20, 30, 40, 50, 60] }), restored);
    expect(colorMap(data, r2)).toEqual(colorMap(data, r1));
    expect(r2.state).toEqual(r1.state); // no reassignment, no drift
    expect(r2.warnings).toEqual([]);
  });

  test("adopt rejects structurally invalid payloads", () => {
    expect(() => adoptScaleState("{}")).toThrow(/valid ScaleState/);
    expect(() =>
      adoptScaleState('{"version":1,"fingerprint":"x","assignments":[["a"]],"nextIndex":1}'),
    ).toThrow(/malformed assignments/);
  });

  test("a future-version state degrades to fresh with a version-mismatch warning", () => {
    const r1 = trainDiscrete(["a"], spec());
    const future = fromAny<ScaleState>({ ...r1.state, version: 99 });
    const r2 = trainDiscrete(["a"], spec(), future);
    expect(r2.warnings.map((w) => w.code)).toEqual(["version-mismatch"]);
    expect(r2.indexOf("a")).toBe(0);
  });
});

describe("fingerprint invalidation on retrain", () => {
  test("equal-value fresh range array preserves assignments (no warning)", () => {
    const r1 = trainDiscrete(["a", "b"], spec());
    const r2 = trainDiscrete(["b", "a"], spec({ range: [...COLORS] }), r1.state);
    expect(r2.warnings).toEqual([]);
    expect(r2.rangeValueOf("a")).toBe(r1.rangeValueOf("a"));
    expect(r2.rangeValueOf("b")).toBe(r1.rangeValueOf("b"));
  });

  test("scheme change discards assignments with a fingerprint-mismatch notice", () => {
    const r1 = trainDiscrete(["a", "b"], spec({ scheme: "set1" }));
    const r2 = trainDiscrete(["b", "a"], spec({ scheme: "dark2" }), r1.state);
    expect(r2.warnings.map((w) => w.code)).toEqual(["fingerprint-mismatch"]);
    expect(r2.indexOf("b")).toBe(0); // fresh first-seen assignment
    expect(r2.indexOf("a")).toBe(1);
  });
});

describe("pinned mode: explicit domain suspends, removal restores", () => {
  test("explicit domain maps positionally, keeps stored assignments intact, and restores them", () => {
    // 1) grow: b is first-seen -> index 0
    const r1 = trainDiscrete(["b", "a", "c"], spec());
    expect(r1.indexOf("b")).toBe(0);

    // 2) pin an explicit domain: positional mapping, out-of-domain -> unknown
    const r2 = trainDiscrete(["b", "a", "zzz"], spec({ domain: ["a", "b"] }), r1.state);
    expect(r2.mode).toBe("pinned");
    expect(r2.indexOf("a")).toBe(0); // domain position, not stored assignment
    expect(r2.indexOf("b")).toBe(1);
    expect(r2.rangeValueOf("zzz")).toBeUndefined(); // 'unknown' output
    const ood = r2.warnings.find((w) => w.code === "out-of-domain");
    expect(ood?.values).toEqual(["zzz"]);
    expect(r2.state).toEqual(r1.state); // SUSPENDED, not discarded
    expect(r2.domain).toEqual(["a", "b"]);

    // 3) remove the explicit domain: stored assignments come back verbatim
    const r3 = trainDiscrete(["a", "b", "c"], spec(), r2.state);
    expect(r3.warnings).toEqual([]);
    expect(r3.rangeValueOf("b")).toBe(r1.rangeValueOf("b"));
    expect(r3.rangeValueOf("a")).toBe(r1.rangeValueOf("a"));
    expect(r3.rangeValueOf("c")).toBe(r1.rangeValueOf("c"));
  });

  test("pinning with no prior state yields an empty (fresh) stored state", () => {
    const r = trainDiscrete(["a"], spec({ domain: ["a"] }));
    expect(r.state.assignments).toEqual([]);
    expect(r.state.nextIndex).toBe(0);
  });

  test("duplicate explicit-domain entries are deduplicated positionally", () => {
    const r = trainDiscrete([], spec({ domain: ["a", "b", "a"] }));
    expect(r.domain).toEqual(["a", "b"]);
    expect(r.indexOf("b")).toBe(1);
  });
});

describe("palette exhaustion contract", () => {
  const twoColors = () => spec({ range: ["#111", "#222"] });

  test("cycle (default): wraps, warns exactly once, and the latch persists in state", () => {
    const r1 = trainDiscrete(["a", "b", "c"], twoColors());
    expect(r1.rangeValueOf("c")).toBe("#111"); // index 2 % 2 -> range[0]
    expect(r1.warnings.map((w) => w.code)).toEqual(["palette-exhausted"]);
    expect(r1.state.exhaustWarned).toBe(true);

    // next render adds yet another value: NO second warning
    const r2 = trainDiscrete(["a", "b", "c", "d"], twoColors(), r1.state);
    expect(r2.warnings).toEqual([]);
    expect(r2.rangeValueOf("d")).toBe("#222"); // 3 % 2 -> range[1]
    expect(r2.rangeValueOf("a")).toBe(r1.rangeValueOf("a")); // stability holds while cycling
  });

  test("the latch survives serialization", () => {
    const r1 = trainDiscrete(["a", "b", "c"], twoColors());
    const adopted = adoptScaleState(serializeScaleState(r1.state));
    const r2 = trainDiscrete(["a", "b", "c", "d"], twoColors(), adopted);
    expect(r2.warnings).toEqual([]);
  });

  test("onExhaust: 'error' throws in grow mode", () => {
    expect(() =>
      trainDiscrete(["a", "b", "c"], spec({ range: ["#111", "#222"], onExhaust: "error" })),
    ).toThrow(PaletteExhaustedError);
  });

  test("explicit domain longer than range: cycle warns, error throws", () => {
    const pinnedLong = { domain: ["a", "b", "c"], range: ["#111", "#222"] };
    const r = trainDiscrete([], spec(pinnedLong));
    expect(r.warnings.map((w) => w.code)).toEqual(["palette-exhausted"]);
    expect(r.rangeValueOf("c")).toBe("#111");
    expect(() => trainDiscrete([], spec({ ...pinnedLong, onExhaust: "error" }))).toThrow(
      PaletteExhaustedError,
    );
  });
});

describe("SSR adoption sketch", () => {
  // Server: stateless first-seen training from the SSR data; the adapter embeds
  // the serialized state in the SSR payload. Client: adopts it before its first
  // pipeline run, so first paint reuses the server's exact assignments.
  test("serialize on server, adopt on client, no reassignment on hydrate", () => {
    const data = ["checkout", "search", "browse"];
    const scaleSpec = spec({ scheme: "set1" });

    // --- server render ---
    const server = trainDiscrete(data, scaleSpec, null);
    const ssrPayload = serializeScaleState(server.state); // embedded in HTML

    // --- client hydrate: same data, adopted state ---
    const client = trainDiscrete(data, scaleSpec, adoptScaleState(ssrPayload));
    expect(client.state).toEqual(server.state); // byte-identical state commit
    expect(colorMap(data, client)).toEqual(colorMap(data, server)); // no color shift
    expect(client.warnings).toEqual([]);

    // --- later client update: new series appends, SSR-era colors untouched ---
    const update = trainDiscrete([...data, "refunds"], scaleSpec, client.state);
    expect(colorMap(data, update)).toEqual(colorMap(data, server));
    expect(update.indexOf("refunds")).toBe(3);
  });
});
