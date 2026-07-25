/**
 * Plot-level composition advisories (ADR 0013 / #659).
 *
 * Sibling union to InteractionDiagnostic and DeprecationDiagnostic, delivered
 * through the existing `ondiagnostic` channel as PlotDiagnostic.
 *
 * Three families:
 * - keyed MERGE, scales (`kind: "scale"`): duplicate aesthetic channels after
 *   shallow per-key merge → `DUPLICATE_SCALE_CHANNEL`
 * - keyed MERGE, everything else (`kind: "labs" | "guides" | "legend"`, #659
 *   slice 6): duplicate keys in the same shallow merge → `DUPLICATE_MERGE_KEY`
 * - REPLACE (`kind: "coord" | "facet" | "theme"`): two children of the same
 *   kind → one silently wins → `DUPLICATE_PLOT_LAYER`
 *
 * The scale family keeps its own code rather than folding into
 * DUPLICATE_MERGE_KEY: it shipped in 0.11.0, its `channel` field and its
 * spelling-alias suggestion are scale-specific, and renaming a live advisory
 * code would break consumer `switch`es for no behavioural gain.
 */

export type CompositionDiagnosticCode =
  | "DUPLICATE_SCALE_CHANNEL"
  | "DUPLICATE_MERGE_KEY"
  | "DUPLICATE_PLOT_LAYER";

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

/** Keyed-MERGE families other than scales (#659 slice 6). */
export type DuplicateMergeKeyKind = "labs" | "guides" | "legend";

/**
 * Two children of one keyed-MERGE family wrote the same key. Unlike the
 * REPLACE families nothing is wholesale lost — only that one key, where the
 * later child's value silently overwrites the earlier one's.
 */
export interface DuplicateMergeKeyDiagnostic {
  readonly severity: "advisory";
  readonly code: "DUPLICATE_MERGE_KEY";
  readonly message: string;
  readonly kind: DuplicateMergeKeyKind;
  /** The colliding key: a labs/legend option name, or a guides channel. */
  readonly key: string;
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

export type CompositionDiagnostic =
  | DuplicateScaleChannelDiagnostic
  | DuplicateMergeKeyDiagnostic
  | DuplicatePlotLayerDiagnostic;

export function isCompositionDiagnostic(d: { readonly code: string }): d is CompositionDiagnostic {
  return (
    d.code === "DUPLICATE_SCALE_CHANNEL" ||
    d.code === "DUPLICATE_MERGE_KEY" ||
    d.code === "DUPLICATE_PLOT_LAYER"
  );
}

/** Narrow to the scale variant so `.channel` consumers stay type-safe. */
export function isDuplicateScaleChannelDiagnostic(
  d: CompositionDiagnostic | { readonly code: string },
): d is DuplicateScaleChannelDiagnostic {
  return d.code === "DUPLICATE_SCALE_CHANNEL";
}

/** Narrow to the non-scale keyed-MERGE variant so `.key` consumers stay safe. */
export function isDuplicateMergeKeyDiagnostic(
  d: CompositionDiagnostic | { readonly code: string },
): d is DuplicateMergeKeyDiagnostic {
  return d.code === "DUPLICATE_MERGE_KEY";
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

const GUIDE_LABS_CHILDREN = "https://ggsvelte.sh/guide/upgrading#compose-labs-as-a-child-layer";
const GUIDE_GUIDES_CHILDREN = "https://ggsvelte.sh/guide/upgrading#compose-guides-as-child-layers";
const GUIDE_LEGEND_CHILDREN = "https://ggsvelte.sh/guide/upgrading#compose-legend-as-a-child-layer";

const PLOT_LAYER_DOC_URL: Readonly<Record<DuplicatePlotLayerKind, string>> = {
  coord: GUIDE_COORD_CHILDREN,
  facet: GUIDE_FACET_CHILDREN,
  theme: GUIDE_THEME_CHILDREN,
};

const MERGE_KEY_DOC_URL: Readonly<Record<DuplicateMergeKeyKind, string>> = {
  labs: GUIDE_LABS_CHILDREN,
  guides: GUIDE_GUIDES_CHILDREN,
  legend: GUIDE_LEGEND_CHILDREN,
};

/** How each merge-key family names the thing that collided, for the message. */
const MERGE_KEY_NOUN: Readonly<Record<DuplicateMergeKeyKind, string>> = {
  labs: "label",
  guides: "channel",
  legend: "option",
};

/** The child element authors should look for when a key collides. */
const MERGE_KEY_CHILD: Readonly<Record<DuplicateMergeKeyKind, string>> = {
  labs: "<Labs>",
  guides: "<Guide*>",
  legend: "<Legend>",
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
  DUPLICATE_MERGE_KEY: {
    severity: "advisory",
    code: "DUPLICATE_MERGE_KEY",
    messageTemplate: (key) =>
      `Multiple children set "${key}"; later children overwrite earlier ones.`,
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

/** Build a fully-populated duplicate merge-key advisory (labs/guides/legend). */
export function duplicateMergeKeyDiagnostic(
  kind: DuplicateMergeKeyKind,
  key: string,
): DuplicateMergeKeyDiagnostic {
  const entry = COMPOSITION_DIAGNOSTIC_CATALOG.DUPLICATE_MERGE_KEY;
  return {
    severity: entry.severity,
    code: "DUPLICATE_MERGE_KEY",
    message: entry.messageTemplate(key),
    kind,
    key,
    suggestions: [
      `Set the ${MERGE_KEY_NOUN[kind]} "${key}" on exactly one ${MERGE_KEY_CHILD[kind]} child`,
      `${kind} is a MERGE family: siblings that touch different ${MERGE_KEY_NOUN[kind]}s all survive — only "${key}" is overwritten`,
    ],
    docUrl: MERGE_KEY_DOC_URL[kind],
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
