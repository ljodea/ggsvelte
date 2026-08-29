import type { ReactNode } from "react";

import type { CellValue, RenderModel } from "@ggsvelte/core";
import type { A11yMode, AesInput, DataInput, LayerInput, SpecInput } from "@ggsvelte/spec";

import type {
  InspectInput,
  InteractionTool,
  PlotInteractionController,
  PlotInteractionEvent,
  PlotInteractionScope,
  PlotSelection,
  SelectInput,
  ZoomDomains,
  ZoomEvent,
  ZoomInput,
} from "./interaction.js";
import type { PlotInspection } from "./interaction.js";

export interface GGPlotHandle {
  resetScales(): void;
  setZoom(domains: Partial<ZoomDomains>): void;
}

export interface GGPlotProps<Row extends Record<string, CellValue> = Record<string, CellValue>> {
  spec?: SpecInput;
  data?: DataInput | readonly Row[];
  aes?: AesInput;
  layers?: LayerInput[];
  a11y?: A11yMode;
  width?: number | "container";
  height?: number;
  /**
   * Durable row identity. Use this in JSX — React does not pass `key` through
   * as a plot prop. Inspect / select / createPlotInteraction identity still win.
   */
  identity?: PropertyKey | ((row: Row, index: number) => PropertyKey);
  /** @deprecated since 0.21.0 — React strips JSX `key`; use `identity`. */
  key?: PropertyKey | ((row: Row, index: number) => PropertyKey);
  inspect?: InspectInput;
  select?: SelectInput;
  zoom?: ZoomInput;
  tool?: InteractionTool;
  interaction?: PlotInteractionController;
  interactionScope?: PlotInteractionScope;
  oninspect?: (inspection: PlotInspection<Row>) => void;
  onselect?: (selection: PlotSelection) => void;
  onzoom?: (event: ZoomEvent) => void;
  oninteraction?: (event: PlotInteractionEvent<Row>) => void;
  onrender?: (model: RenderModel, spec: unknown) => void;
  ariaLabel?: string;
  children?: ReactNode;
}
