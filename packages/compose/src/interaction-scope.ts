/** Shared host interaction scope types used by assemble (no framework). */

export interface PlotInteractionScope {
  readonly keys: string;
  readonly x?: string;
  readonly y?: string;
  /** Namespace for semantic facet intervals. Defaults to `keys` when omitted. */
  readonly intervals?: string;
}

export interface ZoomOptions {
  readonly mode?: "x" | "y" | "xy";
  readonly trigger?: "brush";
}

export type ZoomInput = boolean | ZoomOptions;
