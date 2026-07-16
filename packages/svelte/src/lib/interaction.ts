import type { CellValue } from "@ggsvelte/core";
import type { Snippet } from "svelte";

import type { LegendFilterEvent } from "./legend-filter.js";

export type InteractionSource = "pointer" | "keyboard" | "touch" | "programmatic";
export type InspectMode = "auto" | "exact" | "x" | "y" | "xy";
export type ResolvedInspectMode = Exclude<InspectMode, "auto">;
export type AreaMode = "x" | "y" | "xy";
export type InteractionTool = "inspect" | "point" | "select-area" | "zoom-area";

/** Brush tools that need crosshair cursor and touch-action: none on capture. */
export type AreaInteractionTool = "select-area" | "zoom-area";

export function isAreaTool(tool: InteractionTool): tool is AreaInteractionTool {
  return tool === "select-area" || tool === "zoom-area";
}

export interface TooltipField {
  readonly channel: string;
  readonly field: string;
  readonly value: CellValue;
}

export interface PlotDatum<Row, Key> {
  readonly key: Key | null;
  readonly row: Row | null;
  readonly sourceKeys: ReadonlyArray<Key>;
  readonly lineageCount: number;
  readonly layerIndex: number;
  readonly panelId: string | null;
  readonly fields: ReadonlyArray<TooltipField>;
  readonly anchor: Readonly<{ x: number; y: number }>;
}

export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

interface PlotInspectionBase<Row, Key> {
  readonly type: "inspect";
  readonly phase: "change";
  readonly state: "transient" | "pinned";
  readonly source: InteractionSource;
  readonly panelId: string | null;
  readonly focus: PlotDatum<Row, Key>;
  readonly members: NonEmptyReadonlyArray<PlotDatum<Row, Key>>;
}

export type PlotInspectionChange<Row, Key> =
  | (PlotInspectionBase<Row, Key> & { readonly mode: "exact" | "xy" })
  | (PlotInspectionBase<Row, Key> & {
      readonly mode: "x" | "y";
      readonly axisValue: CellValue;
      readonly axisLabel: string;
    });

export interface PlotInspectionClear {
  readonly type: "inspect";
  readonly phase: "clear";
  readonly source: InteractionSource;
}

export type PlotInspection<Row, Key = PropertyKey> =
  | PlotInspectionChange<Row, Key>
  | PlotInspectionClear;

export interface IntervalSelection<Key = PropertyKey> {
  readonly type: "select";
  readonly phase: "start" | "change" | "end" | "clear";
  readonly mode: AreaMode;
  readonly panelId: string | null;
  readonly domain: Readonly<{
    x?: readonly [CellValue, CellValue];
    y?: readonly [CellValue, CellValue];
  }>;
  readonly pixels: Readonly<{ x0: number; y0: number; x1: number; y1: number }>;
  readonly keys: ReadonlyArray<Key>;
  readonly lineageCount: number;
  readonly source: InteractionSource;
}

export interface PointSelection<Key = PropertyKey> {
  readonly type: "select";
  readonly phase: "end" | "clear";
  readonly mode: "point";
  readonly keys: ReadonlyArray<Key>;
  readonly source: InteractionSource;
}

export type PlotSelection<Key = PropertyKey> = IntervalSelection<Key> | PointSelection<Key>;

export interface ZoomEvent {
  readonly type: "zoom";
  readonly phase: "end" | "clear";
  readonly source: InteractionSource;
  readonly domains: ReadonlyZoomDomains | null;
}

export interface LegendFocusChange<Key = PropertyKey> {
  readonly type: "legend-focus";
  readonly phase: "change";
  readonly state: "transient" | "committed";
  readonly source: InteractionSource;
  readonly scale: "color" | "fill";
  /** Raw encoded domain value. This is deliberately distinct from row keys. */
  readonly value: CellValue;
  readonly label: string;
  readonly keys: ReadonlyArray<Key>;
}

export interface LegendFocusClear {
  readonly type: "legend-focus";
  readonly phase: "clear";
  readonly source: InteractionSource;
}

export type LegendFocusEvent<Key = PropertyKey> = LegendFocusChange<Key> | LegendFocusClear;

export type PlotInteractionEvent<Row, Key = PropertyKey> =
  | PlotInspection<Row, Key>
  | PlotSelection<Key>
  | ZoomEvent
  | LegendFocusEvent<Key>
  | LegendFilterEvent;

export interface InspectOptions<Row = Record<string, CellValue>, Key = PropertyKey> {
  readonly mode?: InspectMode;
  readonly pin?: boolean;
  readonly maxDistance?: number;
  readonly contentMode?: "informational" | "interactive";
  readonly content?: Snippet<[PlotInspectionChange<Row, Key>]>;
}

export interface SelectOptions {
  readonly type: "point" | "interval";
  readonly mode?: AreaMode;
  readonly multiple?: boolean;
  readonly persistent?: boolean;
  /** Facet coordination semantics for durable interval selections. */
  readonly preset?: FacetIntervalPreset;
}

export interface ZoomOptions {
  readonly mode?: AreaMode;
  readonly trigger?: "brush";
}

export type InspectInput<Row = Record<string, CellValue>, Key = PropertyKey> =
  | boolean
  | InspectOptions<Row, Key>;
export type SelectInput = false | "point" | "interval" | SelectOptions;
export type ZoomInput = boolean | ZoomOptions;
export interface LegendFocusOptions {
  /** Preview a legend group on pointer hover and DOM focus. */
  readonly preview?: boolean;
}
export type LegendFocusInput = boolean | LegendFocusOptions;

export type InteractionDiagnosticCode =
  | "INTERACTION_INTERVAL_FACET_UNSUPPORTED"
  | "INTERACTION_INVALID_MAX_DISTANCE"
  | "INTERACTION_POINT_REQUIRES_KEY"
  | "INTERACTION_INTERVAL_PRESET_REQUIRES_KEY"
  | "INTERACTION_INVALID_KEY"
  | "INTERACTION_DUPLICATE_KEY"
  | "INTERACTION_UNSTABLE_KEY"
  | "INTERACTION_MISSING_LINEAGE"
  | "INTERACTION_LEGEND_REQUIRES_KEY"
  | "INTERACTION_LEGEND_DISCRETE_ONLY"
  | "INTERACTION_INTERVAL_SCALE_UNSUPPORTED"
  | "INTERACTION_TOOL_UNAVAILABLE";

export interface InteractionDiagnostic {
  readonly severity: "error" | "warning" | "advisory";
  readonly code: InteractionDiagnosticCode;
  readonly message: string;
  readonly prop: string;
  readonly actual?: unknown;
  readonly suggestions: ReadonlyArray<string>;
  readonly docUrl: string;
}

export const INTERACTION_DIAGNOSTIC_CATALOG: Readonly<
  Record<InteractionDiagnosticCode, Omit<InteractionDiagnostic, "actual">>
> = Object.freeze({
  INTERACTION_INTERVAL_FACET_UNSUPPORTED: {
    severity: "warning",
    code: "INTERACTION_INTERVAL_FACET_UNSUPPORTED",
    message: "Brush zoom currently requires one unfaceted panel.",
    prop: "zoom",
    suggestions: [
      "Remove the facet",
      "Use faceted interval selection",
      "Zoom a linked detail view",
    ],
    docUrl:
      "https://ljodea.github.io/ggsvelte/guide/interaction-reference#interaction-interval-facet-unsupported",
  },
  INTERACTION_INVALID_MAX_DISTANCE: {
    severity: "error",
    code: "INTERACTION_INVALID_MAX_DISTANCE",
    message: "inspect.maxDistance must be a finite non-negative CSS-pixel distance.",
    prop: "inspect.maxDistance",
    suggestions: ["Use a finite number greater than or equal to zero"],
    docUrl:
      "https://ljodea.github.io/ggsvelte/guide/interaction-reference#interaction-invalid-max-distance",
  },
  INTERACTION_POINT_REQUIRES_KEY: {
    severity: "warning",
    code: "INTERACTION_POINT_REQUIRES_KEY",
    message: "Durable point selection requires a stable key field or accessor.",
    prop: "key",
    suggestions: ['Pass key="id"', "Pass a stable key accessor"],
    docUrl:
      "https://ljodea.github.io/ggsvelte/guide/interaction-reference#interaction-point-requires-key",
  },
  INTERACTION_INTERVAL_PRESET_REQUIRES_KEY: {
    severity: "warning",
    code: "INTERACTION_INTERVAL_PRESET_REQUIRES_KEY",
    message:
      "Coordinated interval presets (union, cross-panel) require a stable key field or accessor; without one they combine no rows.",
    prop: "key",
    suggestions: ['Pass key="id"', "Pass a stable key accessor"],
    docUrl:
      "https://ljodea.github.io/ggsvelte/guide/interaction-reference#interaction-interval-preset-requires-key",
  },
  INTERACTION_INVALID_KEY: {
    severity: "error",
    code: "INTERACTION_INVALID_KEY",
    message: "A key accessor returned null, undefined, or a non-PropertyKey value.",
    prop: "key",
    suggestions: ["Return a stable string, number, or symbol for every row"],
    docUrl: "https://ljodea.github.io/ggsvelte/guide/interaction-reference#interaction-invalid-key",
  },
  INTERACTION_DUPLICATE_KEY: {
    severity: "error",
    code: "INTERACTION_DUPLICATE_KEY",
    message:
      "The key accessor returned a duplicate value; durable interaction is disabled for that value.",
    prop: "key",
    suggestions: ["Use a field that uniquely identifies each source row"],
    docUrl:
      "https://ljodea.github.io/ggsvelte/guide/interaction-reference#interaction-duplicate-key",
  },
  INTERACTION_UNSTABLE_KEY: {
    severity: "error",
    code: "INTERACTION_UNSTABLE_KEY",
    message: "The key accessor returned a different value for the same source row.",
    prop: "key",
    suggestions: ["Return an immutable field that uniquely identifies each row"],
    docUrl:
      "https://ljodea.github.io/ggsvelte/guide/interaction-reference#interaction-unstable-key",
  },
  INTERACTION_MISSING_LINEAGE: {
    severity: "warning",
    code: "INTERACTION_MISSING_LINEAGE",
    message: "A synthetic or aggregate mark did not expose source-row lineage.",
    prop: "layers",
    suggestions: ["Use a stat that preserves source-row lineage"],
    docUrl:
      "https://ljodea.github.io/ggsvelte/guide/interaction-reference#interaction-missing-lineage",
  },
  INTERACTION_LEGEND_REQUIRES_KEY: {
    severity: "warning",
    code: "INTERACTION_LEGEND_REQUIRES_KEY",
    message:
      "Legend focus requires stable row keys so encoded legend values never become identities.",
    prop: "key",
    suggestions: ['Pass key="id"', "Pass a stable key accessor"],
    docUrl:
      "https://ljodea.github.io/ggsvelte/guide/interaction-reference#interaction-legend-requires-key",
  },
  INTERACTION_LEGEND_DISCRETE_ONLY: {
    severity: "advisory",
    code: "INTERACTION_LEGEND_DISCRETE_ONLY",
    message:
      "Legend focus currently applies to discrete color and fill legends; continuous ramps remain static.",
    prop: "legendFocus",
    suggestions: ["Use a discrete color or fill mapping", "Keep the continuous ramp static"],
    docUrl:
      "https://ljodea.github.io/ggsvelte/guide/interaction-reference#interaction-legend-discrete-only",
  },
  INTERACTION_INTERVAL_SCALE_UNSUPPORTED: {
    severity: "warning",
    code: "INTERACTION_INTERVAL_SCALE_UNSUPPORTED",
    message: "Interval domains and brush zoom require continuous linear, log, or time scales.",
    prop: "scales",
    suggestions: ["Use a continuous positional scale", "Use point inspection for band data"],
    docUrl:
      "https://ljodea.github.io/ggsvelte/guide/interaction-reference#interaction-interval-scale-unsupported",
  },
  INTERACTION_TOOL_UNAVAILABLE: {
    severity: "warning",
    code: "INTERACTION_TOOL_UNAVAILABLE",
    message: "The requested interaction tool is unavailable for the enabled capabilities.",
    prop: "tool",
    suggestions: ["Enable the matching capability", "Choose an available interaction tool"],
    docUrl:
      "https://ljodea.github.io/ggsvelte/guide/interaction-reference#interaction-tool-unavailable",
  },
});

export interface ResolvedInteractionConfig<Row = Record<string, CellValue>, Key = PropertyKey> {
  readonly interactive: boolean;
  readonly inspect: Readonly<
    Required<Omit<InspectOptions<Row, Key>, "content">> & Pick<InspectOptions<Row, Key>, "content">
  > | null;
  readonly select: Readonly<Required<SelectOptions>> | null;
  readonly zoom: Readonly<Required<ZoomOptions>> | null;
  readonly legendFocus: Readonly<Required<LegendFocusOptions>> | null;
  readonly initialTool: InteractionTool;
  readonly availableTools: ReadonlyArray<InteractionTool>;
  readonly diagnostics: ReadonlyArray<InteractionDiagnostic>;
}

export interface InteractionConfigInput<Row = Record<string, CellValue>, Key = PropertyKey> {
  readonly inspect?: InspectInput<Row, Key>;
  readonly select?: SelectInput;
  readonly zoom?: ZoomInput;
  readonly legendFocus?: LegendFocusInput;
  readonly tool?: InteractionTool;
}

export function normalizeInteractionConfig<Row, Key>(
  input: InteractionConfigInput<Row, Key>,
  context: { faceted?: boolean; hasKey?: boolean } = {},
): ResolvedInteractionConfig<Row, Key> {
  const diagnostics: InteractionDiagnostic[] = [];
  let inspect: ResolvedInteractionConfig<Row, Key>["inspect"] = null;
  if (input.inspect !== undefined && input.inspect !== false) {
    const value = input.inspect === true ? {} : input.inspect;
    const maxDistance = value.maxDistance ?? 24;
    if (!Number.isFinite(maxDistance) || maxDistance < 0) {
      diagnostics.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INVALID_MAX_DISTANCE,
        actual: maxDistance,
      });
    } else {
      inspect = Object.freeze({
        mode: value.mode ?? "auto",
        pin: value.pin ?? true,
        maxDistance,
        contentMode: value.contentMode ?? "informational",
        ...(value.content !== undefined && { content: value.content }),
      });
    }
  }

  let select: ResolvedInteractionConfig["select"] = null;
  if (input.select !== undefined && input.select !== false) {
    const value = typeof input.select === "string" ? { type: input.select } : input.select;
    select = Object.freeze({
      type: value.type,
      mode: value.mode ?? "xy",
      multiple: value.multiple ?? false,
      persistent: value.persistent ?? true,
      preset: value.preset ?? "independent",
    });
    if (value.type === "point" && context.hasKey === false) {
      diagnostics.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_POINT_REQUIRES_KEY,
      });
    }
    if (value.type === "interval" && select.preset !== "independent" && context.hasKey === false) {
      // Union combines stored record keys and cross-panel matches candidate
      // semantic keys: with keyless rows both silently select nothing
      // outside the origin rectangle.
      diagnostics.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INTERVAL_PRESET_REQUIRES_KEY,
      });
    }
  }

  let zoom: ResolvedInteractionConfig["zoom"] = null;
  if (input.zoom !== undefined && input.zoom !== false) {
    const value = input.zoom === true ? {} : input.zoom;
    zoom = Object.freeze({
      mode: value.mode ?? "xy",
      trigger: value.trigger ?? "brush",
    });
  }

  let legendFocus: ResolvedInteractionConfig["legendFocus"] = null;
  if (input.legendFocus !== undefined && input.legendFocus !== false) {
    if (context.hasKey === false) {
      diagnostics.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_LEGEND_REQUIRES_KEY,
      });
    } else {
      const value = input.legendFocus === true ? {} : input.legendFocus;
      legendFocus = Object.freeze({ preview: value.preview ?? true });
    }
  }

  if (context.faceted === true && zoom !== null) {
    diagnostics.push({
      ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INTERVAL_FACET_UNSUPPORTED,
    });
    zoom = null;
  }

  const availableTools: InteractionTool[] = [];
  if (inspect !== null || select?.type === "interval" || zoom !== null)
    availableTools.push("inspect");
  if (select?.type === "point") availableTools.push("point");
  if (select?.type === "interval") availableTools.push("select-area");
  if (zoom !== null) availableTools.push("zoom-area");
  const fallbackTool = select?.type === "point" && inspect === null ? "point" : "inspect";
  const requestedTool = input.tool ?? fallbackTool;
  const initialTool = availableTools.includes(requestedTool) ? requestedTool : fallbackTool;
  if (input.tool !== undefined && !availableTools.includes(input.tool)) {
    diagnostics.push({
      ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_TOOL_UNAVAILABLE,
      actual: input.tool,
    });
  }

  return Object.freeze({
    interactive: availableTools.length > 0 || legendFocus !== null,
    inspect,
    select,
    zoom,
    legendFocus,
    initialTool,
    availableTools: Object.freeze(availableTools),
    diagnostics: Object.freeze(diagnostics),
  });
}

export interface ReadonlyZoomDomains {
  readonly x?: readonly [number, number];
  readonly y?: readonly [number, number];
}

/** Semantic namespaces used when one controller coordinates unlike views.
 * Key state crosses charts only through `keys`; data-space zoom crosses one
 * positional channel only when that channel's scope also matches. */
export interface PlotInteractionScope {
  readonly keys: string;
  readonly x?: string;
  readonly y?: string;
  /** Namespace for semantic facet intervals. Defaults to `keys` when omitted. */
  readonly intervals?: string;
}

export type PlotInteractionChange = "selection" | "emphasis" | "interval" | "zoom";

/** How facet interval state is consumed by coordinated panels.
 *
 * - independent: only the matching panel consumes its interval
 * - union: matching rows from every stored panel interval are combined
 * - cross-panel: the sole origin interval is projected into compatible panels
 */
export type FacetIntervalPreset = "independent" | "union" | "cross-panel";

export type SemanticIntervalAxis =
  | Readonly<{
      kind: "linear" | "log" | "time";
      /** Ascending data-space values; time values are Unix milliseconds. */
      domain: readonly [number, number];
    }>
  | Readonly<{
      kind: "band";
      /** Ordered, encoded category identities. Labels are presentation-only. */
      values: ReadonlyArray<string>;
    }>;

export interface ReadonlyIntervalDomains {
  readonly x?: SemanticIntervalAxis;
  readonly y?: SemanticIntervalAxis;
}

export interface PlotInteractionInterval<Key extends PropertyKey> {
  /** Stable structured facet identity, never a panel index. */
  readonly panelId: string;
  readonly preset: FacetIntervalPreset;
  readonly domains: ReadonlyIntervalDomains;
  /** Stable source-row identities selected by this panel interval. */
  readonly keys: ReadonlyArray<Key>;
}

export interface ScopedInteractionInterval<
  Key extends PropertyKey,
> extends PlotInteractionInterval<Key> {
  readonly scope: string;
}

export interface ScopedInteractionKeys<Key extends PropertyKey> {
  readonly scope: string;
  readonly keys: ReadonlyArray<Key>;
}

export interface ScopedInteractionDomain {
  readonly scope: string;
  readonly domain: readonly [number, number];
}

/** Controller semantic state. It deliberately excludes rows, renderer
 * indices, pixel rectangles, candidate ids, models, and DOM references. */
export interface PlotInteractionSnapshot<Key extends PropertyKey> {
  readonly revision: number;
  readonly selections: ReadonlyArray<ScopedInteractionKeys<Key>>;
  readonly emphases: ReadonlyArray<ScopedInteractionKeys<Key>>;
  readonly intervals: ReadonlyArray<ScopedInteractionInterval<Key>>;
  readonly zoom: Readonly<{
    x: ReadonlyArray<ScopedInteractionDomain>;
    y: ReadonlyArray<ScopedInteractionDomain>;
  }>;
}

export interface PlotInteractionTransition<Key extends PropertyKey> {
  readonly revision: number;
  readonly kind: PlotInteractionChange | "reconcile";
  readonly changes: ReadonlyArray<PlotInteractionChange>;
  readonly source: InteractionSource;
  readonly scope: PlotInteractionScope;
  readonly snapshot: PlotInteractionSnapshot<Key>;
}

/** @deprecated Use IntervalSelection. Kept as a source migration alias only. */
export type BrushSelection = IntervalSelection;
/** @deprecated Use PlotInspectionChange. */
export type TooltipContext<
  Row = Record<string, CellValue>,
  Key = PropertyKey,
> = PlotInspectionChange<Row, Key>;
/** @deprecated Use ReadonlyZoomDomains. */
export type ZoomDomains = { x?: [number, number]; y?: [number, number] };
