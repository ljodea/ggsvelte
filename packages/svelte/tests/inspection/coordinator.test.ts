import { describe, expect, it, vi } from "vitest";

import { runPipeline, type CandidateFacts, type RenderModel } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";

// Characterization via the stable resolver.js re-export path (internal barrel).
import {
  clearInspectionFingerprint,
  createInspectionCoordinator,
} from "../../src/lib/inspection/resolver.js";

function sameKindBatchOrdinal(model: RenderModel, seed: CandidateFacts): number {
  return (
    model.scene.batches
      .slice(0, seed.batchIndex + 1)
      .filter((batch) => batch.layerIndex === seed.layerIndex && batch.kind === seed.kind).length -
    1
  );
}

describe("clearInspectionFingerprint", () => {
  it("scopes clear dedupe tokens by interaction source", () => {
    expect(clearInspectionFingerprint("pointer")).toBe("clear:pointer");
    expect(clearInspectionFingerprint("keyboard")).toBe("clear:keyboard");
    expect(clearInspectionFingerprint("programmatic")).toBe("clear:programmatic");
    expect(clearInspectionFingerprint("pointer")).not.toBe(clearInspectionFingerprint("touch"));
  });
});

describe("inspection coordinator", () => {
  it("materializes at most eight transient members and owns exactly two memo slots", () => {
    const data = Array.from({ length: 12 }, (_, index) => ({
      id: `row-${index}`,
      x: 1,
      y: index,
      series: `series-${index}`,
    }));
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y", color: "series" }))
        .geomPoint()
        .spec(),
      { width: 480, height: 320 },
    );
    const coordinator = createInspectionCoordinator((row) => row.id as string);
    const base = {
      model,
      seed: model.candidates.candidate(0)!,
      mode: "x" as const,
      source: "pointer" as const,
      identityEpoch: 1,
      layoutEpoch: 1,
    };
    const transient = coordinator.resolve({ ...base, state: "transient" })!;
    expect(transient.snapshot.members).toHaveLength(8);
    expect(coordinator.resolve({ ...base, state: "transient" })).toBe(transient);
    const pinned = coordinator.resolve({ ...base, state: "pinned" })!;
    expect(pinned.snapshot.members).toHaveLength(12);
    expect(coordinator.memoSize).toBe(2);
    coordinator.release("pinned");
    expect(coordinator.memoSize).toBe(1);
    coordinator.invalidate();
    expect(coordinator.memoSize).toBe(0);
    model.dispose();
  });
  it("separates semantic changes from presentation-only layout changes", () => {
    const data = [
      { id: "a", x: 1, y: 2 },
      { id: "b", x: 2, y: 3 },
    ];
    const makeModel = (width: number) =>
      runPipeline(
        gg(data, aes({ x: "x", y: "y" }))
          .geomPoint()
          .spec(),
        {
          width,
          height: 300,
        },
      );
    const first = makeModel(400);
    const coordinator = createInspectionCoordinator((row) => row.id as string);
    coordinator.resolve({
      model: first,
      seed: first.candidates.candidate(0)!,
      mode: "xy",
      state: "pinned",
      source: "pointer",
      identityEpoch: "data-1",
      layoutEpoch: "layout-1",
    });
    const resized = makeModel(700);
    const reconciled = coordinator.reconcilePinned({
      model: resized,
      identityEpoch: "data-1",
      layoutEpoch: "layout-2",
    })!;
    expect(reconciled.semanticChanged).toBe(false);
    expect(reconciled.presentationChanged).toBe(true);
    first.dispose();
    resized.dispose();
  });
  it("reconciles pins from their unique stable seed and invalidates keyless pins on data epochs", () => {
    const makeModel = (rows: { id: string; x: number; y: number }[], width = 400) =>
      runPipeline(
        gg(rows, aes({ x: "x", y: "y" }))
          .geomPoint()
          .spec(),
        {
          width,
          height: 300,
        },
      );
    const first = makeModel([{ id: "a", x: 1, y: 2 }]);
    const keyed = createInspectionCoordinator((row) => row.id as string);
    keyed.resolve({
      model: first,
      seed: first.candidates.candidate(0)!,
      mode: "xy",
      state: "pinned",
      source: "pointer",
      identityEpoch: 1,
      layoutEpoch: 1,
    });
    const moved = makeModel([{ id: "a", x: 4, y: 8 }], 600);
    const movedPin = keyed.reconcilePinned({
      model: moved,
      identityEpoch: 2,
      layoutEpoch: 2,
    })!;
    expect(movedPin.snapshot.focus.key).toBe("a");
    expect(movedPin.snapshot.source).toBe("programmatic");
    expect(movedPin.semanticChanged).toBe(true);
    expect(movedPin.snapshot.focus.anchor).not.toEqual(
      keyed.resolve({
        model: first,
        seed: first.candidates.candidate(0)!,
        mode: "xy",
        state: "transient",
        source: "pointer",
        identityEpoch: 1,
        layoutEpoch: 1,
      })!.snapshot.focus.anchor,
    );

    const keyless = createInspectionCoordinator(() => null);
    keyless.resolve({
      model: first,
      seed: first.candidates.candidate(0)!,
      mode: "xy",
      state: "pinned",
      source: "pointer",
      identityEpoch: "same-data",
      layoutEpoch: 1,
    });
    const keylessResized = makeModel([{ id: "a", x: 1, y: 2 }], 650);
    expect(
      keyless.reconcilePinned({
        model: keylessResized,
        identityEpoch: "same-data",
        layoutEpoch: 2,
      }),
    ).not.toBeNull();
    expect(
      keyless.reconcilePinned({
        model: moved,
        identityEpoch: "new-data",
        layoutEpoch: 3,
      }),
    ).toBeNull();

    const ambiguous = makeModel([
      { id: "a", x: 4, y: 8 },
      { id: "a", x: 5, y: 9 },
    ]);
    keyed.resolve({
      model: moved,
      seed: moved.candidates.candidate(0)!,
      mode: "xy",
      state: "pinned",
      source: "pointer",
      identityEpoch: 2,
      layoutEpoch: 2,
    });
    expect(
      keyed.reconcilePinned({
        model: ambiguous,
        identityEpoch: 3,
        layoutEpoch: 3,
      }),
    ).toBeNull();
    first.dispose();
    moved.dispose();
    ambiguous.dispose();
    keylessResized.dispose();
  });
  it("keeps a synthetic keyless seed across a layout-only epoch", () => {
    const data = [{ x: "a" }, { x: "a" }, { x: "b" }];
    const makeModel = (width: number) =>
      runPipeline(
        gg(data, aes({ x: "x" }))
          .geomBar()
          .spec(),
        { width, height: 300 },
      );
    const first = makeModel(400);
    const coordinator = createInspectionCoordinator(() => null);
    coordinator.resolve({
      model: first,
      seed: first.candidates.candidate(0)!,
      mode: "exact",
      state: "pinned",
      source: "pointer",
      identityEpoch: "same-data",
      layoutEpoch: 1,
    });
    const resized = makeModel(700);
    expect(
      coordinator.reconcilePinned({
        model: resized,
        identityEpoch: "same-data",
        layoutEpoch: 2,
      }),
    ).not.toBeNull();
    first.dispose();
    resized.dispose();
  });
  it("reconciles the stable batch role of synthetic composite marks", () => {
    const smoothSpec = gg(
      [
        { x: 0, y: 1 },
        { x: 1, y: 3 },
        { x: 2, y: 5 },
      ],
      aes({ x: "x", y: "y" }),
    )
      .geomSmooth({ method: "lm" })
      .spec();
    const boxSpec = gg(
      [
        { group: "a", y: 1 },
        { group: "a", y: 2 },
        { group: "a", y: 3 },
        { group: "a", y: 100 },
      ],
      aes({ x: "group", y: "y" }),
    )
      .geomBoxplot()
      .spec();

    for (const spec of [smoothSpec, boxSpec]) {
      const first = runPipeline(spec, { width: 400, height: 300 });
      const resized = runPipeline(spec, { width: 700, height: 300 });
      const collidingSeeds = Array.from({ length: first.candidates.size }, (_, id) =>
        first.candidates.candidate(id)!,
      ).filter((fact, _, all) =>
        all.some(
          (other) =>
            other.id !== fact.id &&
            other.layerIndex === fact.layerIndex &&
            other.kind === fact.kind &&
            other.primitiveIndex === fact.primitiveIndex &&
            other.xValue === fact.xValue &&
            other.yValue === fact.yValue,
        ),
      );
      expect(collidingSeeds.length).toBeGreaterThanOrEqual(2);

      for (const seed of collidingSeeds) {
        const coordinator = createInspectionCoordinator(() => null);
        coordinator.resolve({
          model: first,
          seed,
          mode: seed.autoMode,
          state: "pinned",
          source: "pointer",
          identityEpoch: "same-data",
          layoutEpoch: first.runId,
        });
        const reconciled = coordinator.reconcilePinned({
          model: resized,
          identityEpoch: "same-data",
          layoutEpoch: resized.runId,
        });
        expect(reconciled).not.toBeNull();
        expect(sameKindBatchOrdinal(resized, reconciled!.seed)).toBe(
          sameKindBatchOrdinal(first, seed),
        );
      }
      first.dispose();
      resized.dispose();
    }
  });
  it("transient fingerprint does not read every row in a large axis group", () => {
    // Complexity: fingerprint used to walk all M members (Object.keys each row)
    // before the slot cache check. Transient now caps at TRANSIENT_MEMBER_LIMIT (8).
    const n = 400;
    const data = Array.from({ length: n }, (_, i) => ({
      id: `r${i}`,
      x: 1,
      y: i,
    }));
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y", color: "id" }))
        .geomPoint()
        .spec(),
      { width: 400, height: 300 },
    );
    const originalRow = model.row.bind(model);
    let rowReads = 0;
    vi.spyOn(model, "row").mockImplementation((index: number) => {
      rowReads++;
      return originalRow(index);
    });
    const coordinator = createInspectionCoordinator((row) => (row as { id: string }).id);
    rowReads = 0;
    const resolved = coordinator.resolve({
      model,
      seed: model.candidates.candidate(0)!,
      mode: "x",
      state: "transient",
      source: "pointer",
      identityEpoch: 1,
      layoutEpoch: "layout-1",
      completeness: "transient",
    });
    expect(resolved).not.toBeNull();
    // Full-group fingerprint would read ~n member rows (+ focus). Cap ≈ 8 members + focus + materialize.
    expect(rowReads).toBeLessThan(40);
    expect(rowReads).toBeLessThan(n / 5);
    model.dispose();
  });
  it("fingerprints null/Date/-0 cells and symbol keys in coordinated snapshots", () => {
    const data = [
      { id: "a", x: 1, y: 2 },
      { id: "b", x: 1, y: 3 },
    ];
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y", color: "id" }))
        .geomPoint()
        .spec(),
      { width: 400, height: 300 },
    );
    // Inject cell shapes cellToken handles specially (null / Date / -0) without
    // going through PortableSpec validation, which rejects Date/null payloads.
    const originalRow = model.row.bind(model);
    vi.spyOn(model, "row").mockImplementation((index: number) => {
      const base = originalRow(index);
      if (base === null) return null;
      return {
        ...base,
        note: index === 0 ? null : "ok",
        when: new Date("2020-01-01T00:00:00Z"),
        y: index === 1 ? -0 : base["y"],
      };
    });
    const symbols = new Map<string, symbol>([
      ["a", Symbol("a")],
      ["b", Symbol("b")],
    ]);
    const coordinator = createInspectionCoordinator((row) => {
      const id = String(row.id);
      return symbols.get(id) ?? null;
    });
    const epoch = Symbol("layout");
    const resolved = coordinator.resolve({
      model,
      seed: model.candidates.candidate(0)!,
      mode: "x",
      state: "transient",
      source: "pointer",
      identityEpoch: 1,
      layoutEpoch: epoch,
    });
    expect(resolved).not.toBeNull();
    expect(resolved!.snapshot.members.length).toBeGreaterThanOrEqual(1);
    // Symbol keys must stay distinct across the same string identity.
    expect([...new Set(resolved!.semanticFingerprint.match(/symbol:\d+/g) ?? [])]).toEqual([
      "symbol:0",
      "symbol:1",
    ]);
    // null/Date/-0 all contribute typed cell tokens to the fingerprint payload.
    expect(resolved!.semanticFingerprint).toContain("note=null");
    expect(resolved!.semanticFingerprint).toContain("when=date:1577836800000");
    expect(resolved!.semanticFingerprint).toContain("y=number:0");
    // Re-resolve with the same symbol layout epoch must hit the memo slot.
    expect(
      coordinator.resolve({
        model,
        seed: model.candidates.candidate(0)!,
        mode: "x",
        state: "transient",
        source: "pointer",
        identityEpoch: 1,
        layoutEpoch: epoch,
      }),
    ).toBe(resolved);
    model.dispose();
  });
  it("returns null from reconcilePinned when no pin is active", () => {
    const model = runPipeline(
      gg([{ id: "a", x: 1, y: 2 }], aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
      { width: 300, height: 200 },
    );
    const coordinator = createInspectionCoordinator((row) => row.id as string);
    expect(
      coordinator.reconcilePinned({
        model,
        identityEpoch: 1,
        layoutEpoch: 1,
      }),
    ).toBeNull();
    model.dispose();
  });
  it("disambiguates multi-match pins that share one source row via batch role", () => {
    const smoothSpec = gg(
      [
        { x: 0, y: 1 },
        { x: 1, y: 3 },
        { x: 2, y: 5 },
      ],
      aes({ x: "x", y: "y" }),
    )
      .geomSmooth({ method: "lm" })
      .spec();
    const first = runPipeline(smoothSpec, { width: 400, height: 300 });
    const resized = runPipeline(smoothSpec, { width: 700, height: 300 });
    // Keyed coordinator with a constant key so every candidate maps to the same key —
    // reconcile then uses seedKind/batchRole/primitiveIndex to pick one match.
    const coordinator = createInspectionCoordinator(() => "smooth");
    const seed = first.candidates.candidate(0)!;
    coordinator.resolve({
      model: first,
      seed,
      mode: "exact",
      state: "pinned",
      source: "pointer",
      identityEpoch: "same-data",
      layoutEpoch: first.runId,
    });
    const reconciled = coordinator.reconcilePinned({
      model: resized,
      identityEpoch: "same-data",
      layoutEpoch: resized.runId,
    });
    expect(reconciled).not.toBeNull();
    expect(reconciled!.seed.kind).toBe(seed.kind);
    expect(reconciled!.seed.primitiveIndex).toBe(seed.primitiveIndex);
    expect(sameKindBatchOrdinal(resized, reconciled!.seed)).toBe(sameKindBatchOrdinal(first, seed));
    first.dispose();
    resized.dispose();
  });
  it("skips lineage.keys for keyless pin candidates that fail cheap filters", () => {
    const data = Array.from({ length: 40 }, (_, index) => ({
      id: `r${index}`,
      x: index,
      y: (index % 7) + 1,
    }));
    const makeModel = (width: number) =>
      runPipeline(
        gg(data, aes({ x: "x", y: "y" }))
          .geomPoint()
          .spec(),
        { width, height: 300 },
      );
    const first = makeModel(400);
    const resized = makeModel(700);
    expect(first.candidates.size).toBeGreaterThan(10);

    const coordinator = createInspectionCoordinator(() => null);
    const seed = first.candidates.candidate(0)!;
    coordinator.resolve({
      model: first,
      seed,
      mode: "exact",
      state: "pinned",
      source: "pointer",
      identityEpoch: "same-data",
      layoutEpoch: 1,
    });

    const keysSpy = vi.spyOn(resized.lineage, "keys");
    const reconciled = coordinator.reconcilePinned({
      model: resized,
      identityEpoch: "same-data",
      layoutEpoch: 2,
    });
    expect(reconciled).not.toBeNull();
    // Cheap-filter survivors are O(matches); a full-store join walk is O(C).
    // Materialization may call keys a few more times for the matched seed.
    expect(keysSpy.mock.calls.length).toBeLessThan(resized.candidates.size);
    first.dispose();
    resized.dispose();
  });
  it("does not scan every candidate on layout-only keyed pin rebind", () => {
    const count = 2_000;
    const data = Array.from({ length: count }, (_, index) => ({
      id: `r${index}`,
      x: index,
      y: (index % 11) + 1,
    }));
    const makeModel = (width: number) =>
      runPipeline(
        gg(data, aes({ x: "x", y: "y" }))
          .geomPoint()
          .spec(),
        { width, height: 300 },
      );
    const first = makeModel(400);
    const resized = makeModel(700);
    expect(resized.candidates.size).toBe(count);

    const coordinator = createInspectionCoordinator((row) => (row as { id: string }).id);
    coordinator.resolve({
      model: first,
      seed: first.candidates.candidate(0)!,
      mode: "exact",
      state: "pinned",
      source: "pointer",
      identityEpoch: "layout-stable",
      layoutEpoch: 1,
    });

    const candidateSpy = vi.spyOn(resized.candidates, "candidate");
    const reconciled = coordinator.reconcilePinned({
      model: resized,
      identityEpoch: "layout-stable",
      layoutEpoch: 2,
    });
    expect(reconciled).not.toBeNull();
    expect(reconciled!.snapshot.focus.key).toBe("r0");
    // seedId O(1) + materialize; a full rebind walk is ~C candidate() lookups.
    expect(candidateSpy.mock.calls.length).toBeLessThan(32);
    expect(candidateSpy.mock.calls.length).toBeLessThan(count / 20);
    first.dispose();
    resized.dispose();
  });
  it("rejects keyed seedId fast path when primitive role no longer matches", () => {
    const data = [{ id: "a", x: 1, y: 2, ymin: 1, ymax: 3 }];
    const points = runPipeline(
      gg(data, aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
      { width: 400, height: 300 },
    );
    const errorbars = runPipeline(
      gg(data, aes({ x: "x", y: "y", ymin: "ymin", ymax: "ymax" }))
        .geomErrorbar()
        .spec(),
      { width: 400, height: 300 },
    );
    const coordinator = createInspectionCoordinator((row) => (row as { id: string }).id);
    const seed = points.candidates.candidate(0)!;
    expect(seed.kind).toBe("points");
    coordinator.resolve({
      model: points,
      seed,
      mode: "exact",
      state: "pinned",
      source: "pointer",
      identityEpoch: "same-epoch",
      layoutEpoch: 1,
    });
    // Same epoch token, different geom at seedId — role mismatch must not pin.
    const atSameId = errorbars.candidates.candidate(seed.id);
    expect(atSameId).not.toBeNull();
    expect(atSameId!.kind).not.toBe("points");
    const reconciled = coordinator.reconcilePinned({
      model: errorbars,
      identityEpoch: "same-epoch",
      layoutEpoch: 2,
    });
    // Full scan finds no points-role match for key "a" → clear pin.
    expect(reconciled).toBeNull();
    points.dispose();
    errorbars.dispose();
  });
  it("does not scan every candidate on layout-only keyless pin rebind", () => {
    const count = 2_000;
    const data = Array.from({ length: count }, (_, index) => ({
      id: `r${index}`,
      x: index,
      y: (index % 11) + 1,
    }));
    const makeModel = (width: number) =>
      runPipeline(
        gg(data, aes({ x: "x", y: "y" }))
          .geomPoint()
          .spec(),
        { width, height: 300 },
      );
    const first = makeModel(400);
    const resized = makeModel(700);

    const coordinator = createInspectionCoordinator(() => null);
    coordinator.resolve({
      model: first,
      seed: first.candidates.candidate(7)!,
      mode: "exact",
      state: "pinned",
      source: "pointer",
      identityEpoch: "layout-stable",
      layoutEpoch: 1,
    });

    const candidateSpy = vi.spyOn(resized.candidates, "candidate");
    const reconciled = coordinator.reconcilePinned({
      model: resized,
      identityEpoch: "layout-stable",
      layoutEpoch: 2,
    });
    expect(reconciled).not.toBeNull();
    expect(candidateSpy.mock.calls.length).toBeLessThan(32);
    expect(candidateSpy.mock.calls.length).toBeLessThan(count / 20);
    first.dispose();
    resized.dispose();
  });
});
