/**
 * Internal props type for <GGPlot>. Not part of the public package surface —
 * the component never exported this type before S11; keep it module-local.
 */
import type { Snippet } from "svelte";

import type {
  A11yMode,
  AesInput,
  CoordSpec,
  DataInput,
  FacetInput,
  GuidesSpec,
  Labs,
  LayerInput,
  LegendSpec,
  PortableSpec,
  Scales,
  SpecInput,
  ThemeName,
  ThemeSpec,
} from "@ggsvelte/spec";
import type { CellValue, RenderModel } from "@ggsvelte/core";

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
  SelectInput,
  ZoomEvent,
  ZoomInput,
} from "./interaction/interaction.js";
import type { PlotInteractionController } from "./interaction/controller.svelte.js";
import type { LegendFilterEvent, LegendFilterInput } from "./legend/filter.js";

type PublicKey<
  Row extends Record<string, CellValue>,
  Identity extends keyof Row | ((row: Row, index: number) => PropertyKey),
> = Identity extends keyof Row
  ? Extract<Row[Identity], PropertyKey>
  : Identity extends (row: Row, index: number) => infer Key
    ? Extract<Key, PropertyKey>
    : never;

export interface GGPlotProps<
  Row extends Record<string, CellValue> = Record<string, CellValue>,
  Identity extends keyof Row | ((row: Row, index: number) => PropertyKey) = keyof Row,
> {
  /** A complete spec (bare-string channel shorthand allowed). Wins over the other props. */
  spec?: SpecInput;
  /** Data rows, columns, or a DataRef ({values}/{columns}/{name}). */
  data?: DataInput | readonly Row[];
  /** Plot-level aesthetic mapping (inherited by every layer). */
  aes?: AesInput;
  /** Layers (props-first canonical form). Wins over declaration-only children. */
  layers?: LayerInput[];
  /** Facet into small multiples (wrap or rows/cols grid). */
  facet?: FacetInput;
  /** Coordinate system ("flip" shorthand accepted). */
  coord?: CoordSpec | "flip";
  /** Per-scale configuration (types, domains, schemes, breaks, labels). */
  scales?: Scales;
  /** Appearance-only guide configuration keyed by aesthetic. */
  guides?: GuidesSpec;
  /** Legacy legend entry ordering. */
  legend?: LegendSpec;
  /** Theme: a registered name or an object with role overrides. */
  theme?: ThemeName | ThemeSpec;
  /** Titles and axis labels. */
  labs?: Labs;
  /** Accessibility mode ("force-svg" keeps every layer as SVG marks). */
  a11y?: A11yMode;
  /** Plot width in px. Omitted is container-responsive. */
  width?: number | "container";
  /** Plot height in px (falls back to spec.height, then 400). */
  height?: number;
  /** Stable semantic identity used by public interaction payloads. */
  key?: Identity;
  /** Opt into inspection, its semantic crosshair, tooltip, and pinning. */
  inspect?: InspectInput;
  /** Opt into point or interval selection. */
  select?: SelectInput;
  /** Opt into brush zoom. */
  zoom?: ZoomInput;
  /** Opt into discrete legend preview, focus, and linked emphasis. */
  legendFocus?: LegendFocusInput;
  /** Opt into data-changing filtering through discrete legend controls. */
  legendFilter?: LegendFilterInput;
  /** Controlled initial/active tool. */
  tool?: InteractionTool;
  /** Optional durable semantic state shared with other plots and Svelte UI. */
  interaction?: PlotInteractionController<PublicKey<Row, Identity>>;
  /** Semantic identity for linked keys and positional domains. */
  interactionScope?: PlotInteractionScope;
  /** Accessible chart name; falls back to the plot title/generated label. */
  ariaLabel?: string;
  oninspect?: (event: PlotInspection<Row, PublicKey<Row, Identity>>) => void;
  onselect?: (event: PlotSelection<PublicKey<Row, Identity>>) => void;
  onzoom?: (event: ZoomEvent) => void;
  onlegendfocus?: (event: LegendFocusEvent<PublicKey<Row, Identity>>) => void;
  onlegendfilter?: (event: LegendFilterEvent) => void;
  oninteraction?: (event: PlotInteractionEvent<Row, PublicKey<Row, Identity>>) => void;
  ondiagnostic?: (diagnostic: InteractionDiagnostic) => void;
  ontoolchange?: (tool: InteractionTool) => void;
  /** Called after each committed render with the model (warnings,
   *  advisories, scales) and the normalized PortableSpec. */
  onrender?: (model: RenderModel, spec: PortableSpec) => void;
  children?: Snippet;
}
