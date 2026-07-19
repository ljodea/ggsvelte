/**
 * Plot orchestrator — controller wiring + host-level deriveds for <GGPlot>.
 *
 * Ownership
 * ---------
 * GGPlot owns: root, captureSurface, a11yTableOpen, plotId (component runes /
 *   bind:this / $props.id / markup-only state). Context (`provideRegistry`) and
 *   `$props()` also stay in the component.
 * Orchestrator owns: tooltipHovered and all controller construction, host
 *   deriveds, and phased effect registration.
 *
 * Construction / effect-order contract
 * ------------------------------------
 * Construction order is the topological order of direct construction-time
 * reads; effect registration sequence is load-bearing. Deferred thunks break
 * the runtime cycles (surface ↔ inspection ↔ interval ↔ selection). This
 * module preserves the pre-S11 top-to-bottom declaration order from GGPlot.
 *
 * Call `createPlotOrchestrator` once during component init so every `$effect`
 * registers in the component effect tree. No `$props`, `$props.id()`, or
 * context calls live here.
 */
import type { BatchInteractionMask, CellValue, RenderModel } from "@ggsvelte/core";
import type {
  A11yMode,
  AesInput,
  CoordSpec,
  DataInput,
  FacetInput,
  Labs,
  LayerInput,
  LegendSpec,
  PortableSpec,
  Scales,
  SpecInput,
  ThemeName,
  ThemeSpec,
} from "@ggsvelte/spec";

import type {
  InspectInput,
  InteractionDiagnostic,
  InteractionTool,
  LegendFocusEvent,
  LegendFocusInput,
  PlotInspection,
  PlotInteractionEvent,
  PlotInteractionScope,
  PlotSelection,
  ResolvedInteractionConfig,
  SelectInput,
  ZoomEvent,
  ZoomInput,
} from "./interaction/interaction.js";
import type { PlotInteractionController } from "./interaction/controller.svelte.js";
import {
  assemblePortableSpec,
  isFacetedPlotIntent,
  resolveInteractionScope,
  toLayerInput,
} from "./assembly/assemble.js";
import type { PlotAnnouncer } from "./runtime/announcer.svelte.js";
import type { PlotRuntime } from "./runtime/runtime.svelte.js";
import type { InteractiveLegendEntry, LegendEntryIdentity } from "./legend/focus.js";
import type { FilterableLegendEntry, LegendFilterState } from "./legend/filter-state.svelte.js";
import type { LegendFocusState } from "./legend/focus-state.svelte.js";
import type { PlotZoomState } from "./zoom/zoom-state.svelte.js";
import type { IntervalState } from "./interval/interval-state.svelte.js";
import type { InspectionState } from "./inspection/inspection-state.svelte.js";
import type { SurfaceState } from "./surface/surface-state.svelte.js";
import type { SelectionState } from "./selection/selection-state.svelte.js";
import type { PlotChromeState } from "./chrome/chrome-state.svelte.js";
import type { LegendFilterEvent, LegendFilterInput } from "./legend/filter.js";
import type { LayerRegistry } from "./geoms/registry.svelte.js";
import { normalizeInteractionConfig } from "./interaction/interaction.js";
import { createPlotInteractionAssembly } from "./plot-interaction-assembly.svelte.js";

// ---------------------------------------------------------------------------
// Inputs / return type
// ---------------------------------------------------------------------------

export type OrchestratorInputs<
  Row extends Record<string, CellValue> = Record<string, CellValue>,
  Identity extends keyof Row | ((row: Row, index: number) => PropertyKey) = keyof Row,
> = {
  /** Value — created by `provideRegistry()` in GGPlot (context stays there). */
  registry: LayerRegistry;
  /** Plain string from `$props.id()` in GGPlot. */
  plotId: string;
  root: () => HTMLDivElement | null;
  captureSurface: () => HTMLDivElement | null;

  // Reactive props / callbacks as getter thunks (post-destructure names).
  spec: () => SpecInput | undefined;
  data: () => DataInput | readonly Row[] | undefined;
  mapping: () => AesInput | undefined;
  layers: () => LayerInput[] | undefined;
  facet: () => FacetInput | undefined;
  coord: () => CoordSpec | "flip" | undefined;
  scales: () => Scales | undefined;
  legend: () => LegendSpec | undefined;
  theme: () => ThemeName | ThemeSpec | undefined;
  labs: () => Labs | undefined;
  a11y: () => A11yMode | undefined;
  width: () => number | "container" | undefined;
  height: () => number | undefined;
  datumKey: () => Identity | undefined;
  /** Defaulted non-optional after destructure. */
  inspect: () => InspectInput;
  select: () => SelectInput;
  zoom: () => ZoomInput;
  legendFocus: () => LegendFocusInput;
  legendFilter: () => LegendFilterInput;
  tool: () => InteractionTool | undefined;
  // Widened to PropertyKey at the boundary — PublicKey is component-local.
  interaction: () => PlotInteractionController<PropertyKey> | undefined;
  interactionScope: () => PlotInteractionScope | undefined;
  oninspect: () => ((event: PlotInspection<Record<string, CellValue>>) => void) | undefined;
  onselect: () => ((event: PlotSelection) => void) | undefined;
  onzoom: () => ((event: ZoomEvent) => void) | undefined;
  onlegendfocus: () => ((event: LegendFocusEvent) => void) | undefined;
  onlegendfilter: () => ((event: LegendFilterEvent) => void) | undefined;
  oninteraction: () =>
    | ((event: PlotInteractionEvent<Record<string, CellValue>>) => void)
    | undefined;
  ondiagnostic: () => ((diagnostic: InteractionDiagnostic) => void) | undefined;
  ontoolchange: () => ((tool: InteractionTool) => void) | undefined;
  onrender: () => ((model: RenderModel, spec: PortableSpec) => void) | undefined;
};

/**
 * Non-generic return surface. Controllers are stable object refs; deriveds
 * that markup reads are `get` accessors. Internal wiring (deliverDiagnostic,
 * inspectEnabled, facetedPlot, factory* casts, …) is not exposed.
 */
export type PlotOrchestrator = {
  // Controllers (stable object references)
  readonly zoomState: PlotZoomState;
  readonly legendFilterState: LegendFilterState;
  readonly runtime: PlotRuntime;
  readonly inspectionState: InspectionState;
  readonly surfaceState: SurfaceState;
  readonly selectionState: SelectionState;
  readonly legendFocusState: LegendFocusState;
  readonly intervalState: IntervalState;
  readonly chromeState: PlotChromeState;
  readonly announcer: PlotAnnouncer;

  // Engine getter accessors — deriveds markup consumes
  readonly assembled: PortableSpec | null;
  readonly interactionConfig: ResolvedInteractionConfig;
  readonly interactive: boolean;
  readonly surfaceInteractive: boolean;
  readonly coordFlipped: boolean;
  readonly legendFocusEnabled: boolean;
  readonly selectedAnchors: { x: number; y: number }[];
  readonly emphasizedAnchors: { x: number; y: number }[];
  readonly interactionMasks: readonly (BatchInteractionMask | null)[];
  readonly interactiveLegendEntries: InteractiveLegendEntry[];
  readonly effectiveLegendPressed: LegendEntryIdentity | null;
  readonly legendClearActive: boolean;
  readonly filterableLegendEntries: FilterableLegendEntry[];

  // get/set tooltipHovered (owned here; markup handlers write via engine)
  tooltipHovered: boolean;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPlotOrchestrator<
  Row extends Record<string, CellValue> = Record<string, CellValue>,
  Identity extends keyof Row | ((row: Row, index: number) => PropertyKey) = keyof Row,
>(inputs: OrchestratorInputs<Row, Identity>): PlotOrchestrator {
  // Reading descriptors through toLayerInput goes through live getters, so
  // geom prop changes flow into this $derived without re-registration.
  // Explicit `spec` short-circuits before registry/children so ignored props
  // do not become reactive dependencies of the assembled plot.
  const assembled: PortableSpec | null = $derived.by(() => {
    const spec = inputs.spec();
    if (spec !== undefined) return assemblePortableSpec({ spec, layers: [] });
    const data = inputs.data();
    const mapping = inputs.mapping();
    const layers = inputs.layers();
    const facet = inputs.facet();
    const coord = inputs.coord();
    const scales = inputs.scales();
    const legend = inputs.legend();
    const theme = inputs.theme();
    const labs = inputs.labs();
    const a11y = inputs.a11y();
    return assemblePortableSpec({
      ...(data !== undefined && { data }),
      ...(mapping !== undefined && { aes: mapping }),
      layers: layers ?? inputs.registry.layers.map(toLayerInput),
      ...(facet !== undefined && { facet }),
      ...(coord !== undefined && { coord }),
      ...(scales !== undefined && { scales }),
      ...(legend !== undefined && { legend }),
      ...(theme !== undefined && { theme }),
      ...(labs !== undefined && { labs }),
      ...(a11y !== undefined && { a11y }),
    });
  });

  // Facet intent: raw prop (declaration-only children before layers register)
  // OR assembled.facet (portable-spec plots that embed facet without a prop).
  const facetedPlot = $derived(isFacetedPlotIntent({ facet: inputs.facet(), assembled }));

  const resolvedInteractionScope: PlotInteractionScope = $derived(
    (() => {
      const interaction = inputs.interaction();
      const interactionScope = inputs.interactionScope();
      const zoom = inputs.zoom();
      const datumKey = inputs.datumKey();
      return resolveInteractionScope({
        interaction,
        ...(interactionScope !== undefined && { interactionScope }),
        zoom,
        faceted: facetedPlot,
        ...(datumKey !== undefined && { datumKey }),
        assembled,
      });
    })(),
  );

  const interactionConfig = $derived(
    (() => {
      const tool = inputs.tool();
      return normalizeInteractionConfig(
        {
          inspect: inputs.inspect(),
          select: inputs.select(),
          zoom: inputs.zoom(),
          legendFocus: inputs.legendFocus(),
          ...(tool !== undefined && { tool }),
        },
        {
          faceted: facetedPlot,
          hasKey: inputs.datumKey() !== undefined,
        },
      );
    })(),
  );

  return createPlotInteractionAssembly({
    inputs,
    assembled: () => assembled,
    interactionConfig: () => interactionConfig,
    resolvedInteractionScope: () => resolvedInteractionScope,
  });
}
