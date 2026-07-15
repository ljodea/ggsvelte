import type { CellValue } from "@ggsvelte/core";
import type { Snippet } from "svelte";

export type InteractionSource = "pointer" | "keyboard" | "touch" | "programmatic";
export type InspectMode = "auto" | "exact" | "x" | "y" | "xy";
export type ResolvedInspectMode = Exclude<InspectMode, "auto">;
export type AreaMode = "x" | "y" | "xy";
export type InteractionTool = "inspect" | "point" | "select-area" | "zoom-area";

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

export type PlotInteractionEvent<Row, Key = PropertyKey> =
  | PlotInspection<Row, Key>
  | PlotSelection<Key>
  | ZoomEvent;

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

export type InteractionDiagnosticCode =
  | "INTERACTION_INTERVAL_FACET_UNSUPPORTED"
  | "INTERACTION_INVALID_MAX_DISTANCE"
  | "INTERACTION_POINT_REQUIRES_KEY"
  | "INTERACTION_INVALID_KEY"
  | "INTERACTION_DUPLICATE_KEY"
  | "INTERACTION_UNSTABLE_KEY"
  | "INTERACTION_MISSING_LINEAGE"
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
    message: "Interval selection and brush zoom currently require one unfaceted panel.",
    prop: "select",
    suggestions: ["Remove the facet", "Use point inspection", "Track facet intervals in issue #3"],
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
  readonly initialTool: InteractionTool;
  readonly availableTools: ReadonlyArray<InteractionTool>;
  readonly diagnostics: ReadonlyArray<InteractionDiagnostic>;
}

export interface InteractionConfigInput<Row = Record<string, CellValue>, Key = PropertyKey> {
  readonly inspect?: InspectInput<Row, Key>;
  readonly select?: SelectInput;
  readonly zoom?: ZoomInput;
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
    });
    if (value.type === "point" && context.hasKey === false) {
      diagnostics.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_POINT_REQUIRES_KEY,
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

  if (context.faceted === true && (select?.type === "interval" || zoom !== null)) {
    diagnostics.push({
      ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INTERVAL_FACET_UNSUPPORTED,
    });
    if (select?.type === "interval") select = null;
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
    interactive: availableTools.length > 0,
    inspect,
    select,
    zoom,
    initialTool,
    availableTools: Object.freeze(availableTools),
    diagnostics: Object.freeze(diagnostics),
  });
}

export interface ReadonlyZoomDomains {
  readonly x?: readonly [number, number];
  readonly y?: readonly [number, number];
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
