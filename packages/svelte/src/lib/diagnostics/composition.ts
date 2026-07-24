/**
 * Plot-level composition advisories (ADR 0013 / #659).
 *
 * Sibling union to InteractionDiagnostic and DeprecationDiagnostic, delivered
 * through the existing `ondiagnostic` channel as PlotDiagnostic.
 *
 * Slice 3 scopes detection to `kind: "scale"` layers (duplicate aesthetic
 * channels after shallow per-key merge). Slices 5–6 generalise to the other
 * keyed-merge families (guides/labs/legend).
 */

export type CompositionDiagnosticCode = "DUPLICATE_SCALE_CHANNEL";

/**
 * `suggestions` and `docUrl` are NOT optional: both sibling members of
 * PlotDiagnostic (InteractionDiagnostic, DeprecationDiagnostic) carry them, so
 * a consumer rendering `d.docUrl` / `d.suggestions` over the union must not
 * break on this variant. An advisory whose whole job is "your chart is
 * silently wrong" is also the last place to omit the fix link.
 */
export interface CompositionDiagnostic {
  readonly severity: "advisory";
  readonly code: CompositionDiagnosticCode;
  readonly message: string;
  readonly channel: string;
  readonly kind: "scale";
  readonly suggestions: ReadonlyArray<string>;
  readonly docUrl: string;
}

export function isCompositionDiagnostic(d: { readonly code: string }): d is CompositionDiagnostic {
  return d.code === "DUPLICATE_SCALE_CHANNEL";
}

const GUIDE_SCALE_CHILDREN = "https://ggsvelte.sh/guide/upgrading#compose-scales-as-child-layers";

/**
 * Frozen catalog entry for composition codes. Message / channel / kind are
 * filled per emission by {@link duplicateScaleChannelDiagnostic}.
 */
export const COMPOSITION_DIAGNOSTIC_CATALOG: Readonly<
  Record<
    CompositionDiagnosticCode,
    Pick<CompositionDiagnostic, "severity" | "code" | "kind"> & {
      readonly messageTemplate: (channel: string) => string;
    }
  >
> = Object.freeze({
  DUPLICATE_SCALE_CHANNEL: {
    severity: "advisory",
    code: "DUPLICATE_SCALE_CHANNEL",
    kind: "scale" as const,
    messageTemplate: (channel) =>
      `Multiple scale children configure channel "${channel}"; later children overwrite earlier ones.`,
  },
});

/** Build a fully-populated duplicate-channel advisory. */
export function duplicateScaleChannelDiagnostic(channel: string): CompositionDiagnostic {
  const entry = COMPOSITION_DIAGNOSTIC_CATALOG.DUPLICATE_SCALE_CHANNEL;
  return {
    severity: entry.severity,
    code: entry.code,
    message: entry.messageTemplate(channel),
    channel,
    kind: entry.kind,
    suggestions: [
      `Keep one scale child per channel — remove all but the intended "${channel}" scale`,
      `British and American spellings write the same channel: <ScaleColorDiscrete/> and <ScaleColourContinuous/> both configure "color"`,
    ],
    docUrl: GUIDE_SCALE_CHILDREN,
  };
}
