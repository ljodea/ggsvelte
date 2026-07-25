/**
 * Plot-level composition advisories (ADR 0013 / #659).
 *
 * Sibling union to InteractionDiagnostic and DeprecationDiagnostic, delivered
 * through the existing `ondiagnostic` channel as PlotDiagnostic.
 *
 * Two families:
 * - keyed MERGE (`kind: "scale"`): duplicate aesthetic channels after shallow
 *   per-key merge → `DUPLICATE_SCALE_CHANNEL`
 * - REPLACE (`kind: "coord" | "facet" | "theme"`): two children of the same
 *   kind → one silently wins → `DUPLICATE_PLOT_LAYER`
 *
 * Guides/labs/legend (keyed merge) are slice 6's problem.
 */

export type CompositionDiagnosticCode = "DUPLICATE_SCALE_CHANNEL" | "DUPLICATE_PLOT_LAYER";

/**
 * `suggestions` and `docUrl` are NOT optional: both sibling members of
 * PlotDiagnostic (InteractionDiagnostic, DeprecationDiagnostic) carry them, so
 * a consumer rendering `d.docUrl` / `d.suggestions` over the union must not
 * break on this variant. An advisory whose whole job is "your chart is
 * silently wrong" is also the last place to omit the fix link.
 */
export interface DuplicateScaleChannelDiagnostic {
  readonly severity: "advisory";
  readonly code: "DUPLICATE_SCALE_CHANNEL";
  readonly message: string;
  readonly channel: string;
  readonly kind: "scale";
  readonly suggestions: ReadonlyArray<string>;
  readonly docUrl: string;
}

export type DuplicatePlotLayerKind = "coord" | "facet" | "theme";

export interface DuplicatePlotLayerDiagnostic {
  readonly severity: "advisory";
  readonly code: "DUPLICATE_PLOT_LAYER";
  readonly message: string;
  readonly kind: DuplicatePlotLayerKind;
  readonly suggestions: ReadonlyArray<string>;
  readonly docUrl: string;
}

export type CompositionDiagnostic = DuplicateScaleChannelDiagnostic | DuplicatePlotLayerDiagnostic;

export function isCompositionDiagnostic(d: { readonly code: string }): d is CompositionDiagnostic {
  return d.code === "DUPLICATE_SCALE_CHANNEL" || d.code === "DUPLICATE_PLOT_LAYER";
}

/** Narrow to the scale variant so `.channel` consumers stay type-safe. */
export function isDuplicateScaleChannelDiagnostic(
  d: CompositionDiagnostic | { readonly code: string },
): d is DuplicateScaleChannelDiagnostic {
  return d.code === "DUPLICATE_SCALE_CHANNEL";
}

/** Narrow to the REPLACE-family plot-layer variant. */
export function isDuplicatePlotLayerDiagnostic(
  d: CompositionDiagnostic | { readonly code: string },
): d is DuplicatePlotLayerDiagnostic {
  return d.code === "DUPLICATE_PLOT_LAYER";
}

const GUIDE_SCALE_CHILDREN = "https://ggsvelte.sh/guide/upgrading#compose-scales-as-child-layers";
const GUIDE_COORD_CHILDREN = "https://ggsvelte.sh/guide/upgrading#compose-coord-as-a-child-layer";
const GUIDE_FACET_CHILDREN = "https://ggsvelte.sh/guide/upgrading#compose-facet-as-a-child-layer";
const GUIDE_THEME_CHILDREN =
  "https://ggsvelte.sh/guide/upgrading#compose-the-theme-as-a-child-layer";

const PLOT_LAYER_DOC_URL: Readonly<Record<DuplicatePlotLayerKind, string>> = {
  coord: GUIDE_COORD_CHILDREN,
  facet: GUIDE_FACET_CHILDREN,
  theme: GUIDE_THEME_CHILDREN,
};

/**
 * Frozen catalog entry for composition codes. Per-emission fields are filled
 * by {@link duplicateScaleChannelDiagnostic} / {@link duplicatePlotLayerDiagnostic}.
 */
export const COMPOSITION_DIAGNOSTIC_CATALOG: Readonly<
  Record<
    CompositionDiagnosticCode,
    Pick<CompositionDiagnostic, "severity" | "code"> & {
      readonly messageTemplate: (subject: string) => string;
    }
  >
> = Object.freeze({
  DUPLICATE_SCALE_CHANNEL: {
    severity: "advisory",
    code: "DUPLICATE_SCALE_CHANNEL",
    messageTemplate: (channel) =>
      `Multiple scale children configure channel "${channel}"; later children overwrite earlier ones.`,
  },
  DUPLICATE_PLOT_LAYER: {
    severity: "advisory",
    code: "DUPLICATE_PLOT_LAYER",
    messageTemplate: (kind) =>
      `Multiple ${kind} children are registered; the last one replaces earlier ones.`,
  },
});

/** Build a fully-populated duplicate-channel advisory. */
export function duplicateScaleChannelDiagnostic(channel: string): DuplicateScaleChannelDiagnostic {
  const entry = COMPOSITION_DIAGNOSTIC_CATALOG.DUPLICATE_SCALE_CHANNEL;
  return {
    severity: entry.severity,
    code: "DUPLICATE_SCALE_CHANNEL",
    message: entry.messageTemplate(channel),
    channel,
    kind: "scale",
    suggestions: [
      `Keep one scale child per channel — remove all but the intended "${channel}" scale`,
      `British and American spellings write the same channel: <ScaleColorDiscrete/> and <ScaleColourContinuous/> both configure "color"`,
    ],
    docUrl: GUIDE_SCALE_CHILDREN,
  };
}

/** Build a fully-populated duplicate REPLACE-family plot-layer advisory. */
export function duplicatePlotLayerDiagnostic(
  kind: DuplicatePlotLayerKind,
): DuplicatePlotLayerDiagnostic {
  const entry = COMPOSITION_DIAGNOSTIC_CATALOG.DUPLICATE_PLOT_LAYER;
  return {
    severity: entry.severity,
    code: "DUPLICATE_PLOT_LAYER",
    message: entry.messageTemplate(kind),
    kind,
    suggestions: [
      `Keep one <${kind === "theme" ? "Theme" : kind === "coord" ? "Coord" : "Facet"}*> child — remove earlier ${kind} children so the intended one is the only registration`,
      `${kind} is a REPLACE family: the last child fully replaces earlier ones (and any ${kind} prop)`,
    ],
    docUrl: PLOT_LAYER_DOC_URL[kind],
  };
}
