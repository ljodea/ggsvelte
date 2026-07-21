/**
 * Agent-facing interaction diagnostic catalog — frozen codes, messages, and
 * doc URLs for capability normalization and runtime key/lineage checks.
 *
 * Extracted from interaction.ts so pure catalog data is not mixed with event
 * types and normalizeInteractionConfig.
 */

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
  | "INTERACTION_TOOL_UNAVAILABLE"
  | "INTERACTION_SCOPE_WITHOUT_CONTROLLER"
  | "INTERACTION_HANDLER_WITHOUT_CAPABILITY";

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
      "https://ggsvelte.sh/guide/interaction-reference#interaction-interval-facet-unsupported",
  },
  INTERACTION_INVALID_MAX_DISTANCE: {
    severity: "error",
    code: "INTERACTION_INVALID_MAX_DISTANCE",
    message: "inspect.maxDistance must be a finite non-negative CSS-pixel distance.",
    prop: "inspect.maxDistance",
    suggestions: ["Use a finite number greater than or equal to zero"],
    docUrl: "https://ggsvelte.sh/guide/interaction-reference#interaction-invalid-max-distance",
  },
  INTERACTION_POINT_REQUIRES_KEY: {
    severity: "warning",
    code: "INTERACTION_POINT_REQUIRES_KEY",
    message: "Durable point selection requires a stable key field or accessor.",
    prop: "key",
    suggestions: ['Pass key="id"', "Pass a stable key accessor"],
    docUrl: "https://ggsvelte.sh/guide/interaction-reference#interaction-point-requires-key",
  },
  INTERACTION_INTERVAL_PRESET_REQUIRES_KEY: {
    severity: "warning",
    code: "INTERACTION_INTERVAL_PRESET_REQUIRES_KEY",
    message:
      "Coordinated interval presets (union, cross-panel) require a stable key field or accessor; without one they combine no rows.",
    prop: "key",
    suggestions: ['Pass key="id"', "Pass a stable key accessor"],
    docUrl:
      "https://ggsvelte.sh/guide/interaction-reference#interaction-interval-preset-requires-key",
  },
  INTERACTION_INVALID_KEY: {
    severity: "error",
    code: "INTERACTION_INVALID_KEY",
    message: "A key accessor returned null, undefined, or a non-PropertyKey value.",
    prop: "key",
    suggestions: ["Return a stable string, number, or symbol for every row"],
    docUrl: "https://ggsvelte.sh/guide/interaction-reference#interaction-invalid-key",
  },
  INTERACTION_DUPLICATE_KEY: {
    severity: "error",
    code: "INTERACTION_DUPLICATE_KEY",
    message:
      "The key accessor returned a duplicate value; durable interaction is disabled for that value.",
    prop: "key",
    suggestions: ["Use a field that uniquely identifies each source row"],
    docUrl: "https://ggsvelte.sh/guide/interaction-reference#interaction-duplicate-key",
  },
  INTERACTION_UNSTABLE_KEY: {
    severity: "error",
    code: "INTERACTION_UNSTABLE_KEY",
    message: "The key accessor returned a different value for the same source row.",
    prop: "key",
    suggestions: ["Return an immutable field that uniquely identifies each row"],
    docUrl: "https://ggsvelte.sh/guide/interaction-reference#interaction-unstable-key",
  },
  INTERACTION_MISSING_LINEAGE: {
    severity: "warning",
    code: "INTERACTION_MISSING_LINEAGE",
    message: "A synthetic or aggregate mark did not expose source-row lineage.",
    prop: "layers",
    suggestions: ["Use a stat that preserves source-row lineage"],
    docUrl: "https://ggsvelte.sh/guide/interaction-reference#interaction-missing-lineage",
  },
  INTERACTION_LEGEND_REQUIRES_KEY: {
    severity: "warning",
    code: "INTERACTION_LEGEND_REQUIRES_KEY",
    message:
      "Legend focus requires stable row keys so encoded legend values never become identities.",
    prop: "key",
    suggestions: ['Pass key="id"', "Pass a stable key accessor"],
    docUrl: "https://ggsvelte.sh/guide/interaction-reference#interaction-legend-requires-key",
  },
  INTERACTION_LEGEND_DISCRETE_ONLY: {
    severity: "advisory",
    code: "INTERACTION_LEGEND_DISCRETE_ONLY",
    message:
      "Legend focus currently applies to discrete color and fill legends; continuous ramps remain static.",
    prop: "legendFocus",
    suggestions: ["Use a discrete color or fill mapping", "Keep the continuous ramp static"],
    docUrl: "https://ggsvelte.sh/guide/interaction-reference#interaction-legend-discrete-only",
  },
  INTERACTION_INTERVAL_SCALE_UNSUPPORTED: {
    severity: "warning",
    code: "INTERACTION_INTERVAL_SCALE_UNSUPPORTED",
    message: "Interval domains and brush zoom require continuous linear, log, or time scales.",
    prop: "scales",
    suggestions: ["Use a continuous positional scale", "Use point inspection for band data"],
    docUrl:
      "https://ggsvelte.sh/guide/interaction-reference#interaction-interval-scale-unsupported",
  },
  INTERACTION_TOOL_UNAVAILABLE: {
    severity: "warning",
    code: "INTERACTION_TOOL_UNAVAILABLE",
    message: "The requested interaction tool is unavailable for the enabled capabilities.",
    prop: "tool",
    suggestions: ["Enable the matching capability", "Choose an available interaction tool"],
    docUrl: "https://ggsvelte.sh/guide/interaction-reference#interaction-tool-unavailable",
  },
  INTERACTION_SCOPE_WITHOUT_CONTROLLER: {
    severity: "advisory",
    code: "INTERACTION_SCOPE_WITHOUT_CONTROLLER",
    message:
      "interactionScope is ignored without an interaction controller; chart-local scope is derived from key and aes.",
    prop: "interactionScope",
    suggestions: [
      "Pass interaction={createPlotInteraction()} to control this plot",
      "Remove interactionScope from uncontrolled plots",
    ],
    docUrl: "https://ggsvelte.sh/guide/interaction-reference#interaction-scope-without-controller",
  },
  INTERACTION_HANDLER_WITHOUT_CAPABILITY: {
    severity: "advisory",
    code: "INTERACTION_HANDLER_WITHOUT_CAPABILITY",
    // Emitted with `prop` overridden to the concrete handler name and
    // `actual` naming the capability prop that would enable it.
    message:
      "An interaction handler is set but its capability prop is not enabled, so the handler never fires.",
    prop: "oninspect / onselect / onzoom / onlegendfocus / onlegendfilter",
    suggestions: [
      "Enable the matching capability prop (for example select for onselect)",
      "Remove the unused handler",
    ],
    docUrl:
      "https://ggsvelte.sh/guide/interaction-reference#interaction-handler-without-capability",
  },
});
