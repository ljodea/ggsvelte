/**
 * #609 data-identity epoch must keep reading mark descriptors' `.data`
 * after the LayerRegistry union widening. Guards
 * plot-interaction-assembly.svelte.ts markLayers migration.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { LayerRegistry } from "../../src/lib/geoms/registry.svelte.js";
import type { PortableSpec } from "../../src/lib/index.js";
import {
  createSourceIdentityTracker,
  dataIdentityEpochToken,
} from "../../src/lib/runtime/semantic-keys.js";
import PlotLayerEpochHost from "../fixtures/PlotLayerEpochHost.svelte";
import PlotLayerHost from "../fixtures/PlotLayerHost.svelte";
import { render } from "../helpers/render.js";

const rowsA = [
  { x: 1, y: 2 },
  { x: 3, y: 4 },
];
const rowsB = [
  { x: 9, y: 8 },
  { x: 7, y: 6 },
];

describe("#609 epoch with non-mark layers registered", () => {
  it("markLayers expose .data; union layers do not (call-site contract)", () => {
    // Documents the silent regression: reading registry.layers under the
    // union makes .data undefined, so layer-local replacements stop bumping
    // the epoch.
    const registry = new LayerRegistry();
    registry.register({
      geom: "point",
      data: rowsA,
    });
    registry.registerPlotLayer({
      kind: "theme",
      get value() {
        return "dark" as const;
      },
    });

    const broken = registry.layers.map((layer) => (layer as { data?: unknown }).data);
    expect(broken.every((data) => data === undefined)).toBe(true);

    const fixed = registry.markLayers.map((layer) => layer.data);
    expect(fixed).toEqual([rowsA]);
  });

  it("epoch token changes when geom-child layer-local data is replaced with a non-mark sibling", async () => {
    let registry: LayerRegistry | undefined;
    const view = render(PlotLayerEpochHost, {
      markData: rowsA,
      theme: "dark",
      capture: (r: LayerRegistry) => {
        registry = r;
      },
    });
    expect(registry).toBeDefined();
    expect(registry!.markLayers).toHaveLength(1);
    expect(registry!.layers.some((layer) => layer.kind === "theme")).toBe(true);

    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);

    // Interaction assembly uses markLayers (not the union).
    const markEpoch = () =>
      dataIdentityEpochToken({
        ready: true,
        dataToken: "none",
        specToken: "none",
        data: null,
        datasets: null,
        layers: registry!.markLayers.map((layer) => ({ data: layer.data })),
        sourceIdentity: id,
      });

    // Broken extraction fingerprints only undefineds.
    const brokenEpoch = () =>
      dataIdentityEpochToken({
        ready: true,
        dataToken: "none",
        specToken: "none",
        data: null,
        datasets: null,
        layers: registry!.layers.map((layer) => ({
          data: (layer as { data?: unknown }).data,
        })),
        sourceIdentity: id,
      });

    const first = markEpoch();
    const brokenFirst = brokenEpoch();

    await view.rerender({
      markData: rowsB,
      theme: "dark",
      capture: (r: LayerRegistry) => {
        registry = r;
      },
    });
    flushSync();

    expect(markEpoch()).not.toBe(first);
    // Broken path stays stable across the data swap (the silent bug).
    expect(brokenEpoch()).toBe(brokenFirst);

    // Full plot still assembles with layer-local data after the swap.
    let assembled: PortableSpec | null = null;
    render(PlotLayerHost, {
      aes: { x: "x", y: "y" },
      markData: rowsB,
      plotLayers: [{ kind: "theme" as const, value: "dark" as const }],
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await expect.poll(() => assembled !== null).toBe(true);
    expect(assembled!.layers[0]!.data).toBeDefined();
  });

  it("isFacetedPlotIntent host path: facet plot layer disables brush zoom with diagnostic", async () => {
    // Wire-through: orchestrator must pass registry.layers into
    // isFacetedPlotIntent, not only the helper signature.
    const diagnostics: Array<{ code: string }> = [];
    const facetedRows = [
      { x: 1, y: 2, g: "a" },
      { x: 2, y: 4, g: "b" },
    ];
    render(PlotLayerHost, {
      data: facetedRows,
      aes: { x: "x", y: "y" },
      point: true,
      // No facet prop — only a registry facet layer.
      plotLayers: [{ kind: "facet" as const, value: { wrap: "g" } }],
      zoom: true,
      ondiagnostic: (diagnostic: { code: string }) => {
        diagnostics.push(diagnostic);
      },
    });
    await expect
      .poll(() => diagnostics.some((d) => d.code === "INTERACTION_INTERVAL_FACET_UNSUPPORTED"))
      .toBe(true);
  });
});
