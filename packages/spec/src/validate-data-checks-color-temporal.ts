/**
 * Temporal color/fill censor recovery for tier-2 data checks.
 * Orchestrated by validate-data-checks-color.ts.
 *
 * Mirrors runtime collectColorChannelValues + sequential/binned train recovery
 * when parseFailure is "censor".
 */
import type { ColorScaleSpec } from "./schema.js";
import { parseTemporalColumn } from "./temporal-column.js";
import type { FieldEvidenceEntry } from "./validate-data-evidence.js";
import {
  temporalDecisionForField,
  temporalParserUsable,
  type ChannelFieldUse,
  type TemporalDecisionCache,
} from "./validate-data-checks-temporal.js";

type ParsedBound = { epochMs: number; kind: string | undefined };
type ParseBound = (value: unknown) => ParsedBound | null;
type TrainingFieldResult = {
  trainingFields: ReadonlySet<string>;
  kindConflicts: boolean;
  conflictingKind: string | null;
};
type TemporalRecoverySetup = {
  temporalInputsUsable: boolean;
  requestsTemporal: boolean;
  parser: Parameters<typeof temporalDecisionForField>[3];
  temporalOptions: Parameters<typeof temporalDecisionForField>[4];
  parseBound: ParseBound;
};

/**
 * Recovery sources for `parseFailure: "censor"` on temporal color/fill scales.
 * Mirrors runtime `collectColorChannelValues` + sequential/binned train:
 * - domain endpoints must parse (else color-domain-invalid / color-binned-domain);
 *   a present-but-unusable domain blocks all recovery (runtime throws first)
 * - binned breaks of length ≥ 2 must parse and be strictly increasing
 * - sibling fields / scaled constants train only when they parse under the
 *   configured parser (and match temporalKind when authored)
 */
export function colorTemporalCensorRecovery(input: {
  config: ColorScaleSpec | undefined;
  colorFields: readonly ChannelFieldUse[];
  colorScaledConstants: readonly unknown[];
  temporalDecisionCache: TemporalDecisionCache;
  evidenceOf: (use: ChannelFieldUse) => FieldEvidenceEntry | undefined;
  typeOf: (use: ChannelFieldUse) => string | null;
}): {
  hasExplicitDomain: boolean;
  hasBinnedBreaks: boolean;
  /** Authored domain exists but is not a usable two-endpoint train bound. */
  domainBlocksRecovery: boolean;
  trainingFields: ReadonlySet<string>;
  constantTrains: boolean;
  /**
   * A channel value (scaled constant or sibling field) parses under the
   * configured/auto parser but conflicts with temporalKind — runtime still
   * includes it in collectColorChannelValues and throws color-temporal-kind.
   */
  kindConflicts: boolean;
  conflictingKind: string | null;
} {
  const { config, colorFields, colorScaledConstants, temporalDecisionCache, typeOf, evidenceOf } =
    input;
  const setup = temporalRecoverySetup(config);
  const { hasExplicitDomain, domainBlocksRecovery } = temporalDomainRecovery(
    config,
    setup.parseBound,
  );

  // Do not drop null breaks: runtime maps every authored break and throws
  // color-binned-breaks when any maps to undefined.
  const hasBinnedBreaks = temporalBinnedBreaksTrain(config, setup.parseBound);
  const fieldResult = temporalTrainingFields({
    config,
    colorFields,
    temporalDecisionCache,
    typeOf,
    evidenceOf,
    parser: setup.parser,
    temporalOptions: setup.temporalOptions,
    enabled: setup.temporalInputsUsable && setup.requestsTemporal,
  });

  const kindOk = (kind: string | undefined): boolean =>
    config?.temporalKind === undefined || kind === undefined || kind === config.temporalKind;
  const constantResult = temporalTrainingConstants(colorScaledConstants, setup.parseBound, kindOk);
  return {
    hasExplicitDomain,
    hasBinnedBreaks,
    domainBlocksRecovery,
    trainingFields: fieldResult.trainingFields,
    constantTrains: constantResult.constantTrains,
    kindConflicts: fieldResult.kindConflicts || constantResult.kindConflicts,
    conflictingKind: constantResult.conflictingKind ?? fieldResult.conflictingKind,
  };
}

function temporalRecoverySetup(config: ColorScaleSpec | undefined): TemporalRecoverySetup {
  const temporalInputsUsable =
    temporalParserUsable(config?.parse) &&
    (config?.timezone === undefined || typeof config.timezone === "string") &&
    (config?.disambiguation === undefined || typeof config.disambiguation === "string");
  const temporalOptions = {
    ...(typeof config?.timezone === "string" && { timezone: config.timezone }),
    ...(typeof config?.disambiguation === "string" && { disambiguation: config.disambiguation }),
  };
  const parser: Parameters<typeof temporalDecisionForField>[3] = config?.parse ?? "auto";
  const requestsTemporal = [
    config?.temporalKind,
    config?.parse,
    config?.timezone,
    config?.disambiguation,
  ].some((value) => value !== undefined);
  return {
    temporalInputsUsable,
    requestsTemporal,
    parser,
    temporalOptions,
    parseBound: temporalBoundParser(temporalInputsUsable, parser, temporalOptions),
  };
}

function temporalDomainRecovery(
  config: ColorScaleSpec | undefined,
  parseBound: ParseBound,
): { hasExplicitDomain: boolean; domainBlocksRecovery: boolean } {
  const domainValues = Array.isArray(config?.domain)
    ? config.domain.filter((value) => value !== null)
    : [];
  const hasExplicitDomain =
    domainValues.length === 2 && domainValues.every((value) => parseBound(value) !== null);
  return {
    hasExplicitDomain,
    domainBlocksRecovery: Array.isArray(config?.domain) && !hasExplicitDomain,
  };
}

function temporalBoundParser(
  usable: boolean,
  parser: Parameters<typeof parseTemporalColumn>[1],
  options: Parameters<typeof parseTemporalColumn>[2],
): ParseBound {
  return (value) => {
    if (!usable || value === null || value === undefined) return null;
    if (!(value instanceof Date) && typeof value !== "string" && typeof value !== "number")
      return null;
    const column = parseTemporalColumn(
      [value] as Parameters<typeof parseTemporalColumn>[0],
      parser,
      options,
    );
    if (column.valid[0] !== 1) return null;
    const epochMs = column.semantic[0];
    if (epochMs === undefined || !Number.isFinite(epochMs)) return null;
    return { epochMs, kind: column.decision.kind ?? undefined };
  };
}

function temporalBinnedBreaksTrain(
  config: ColorScaleSpec | undefined,
  parseBound: ParseBound,
): boolean {
  const breaks = config?.type === "binned" && Array.isArray(config.breaks) ? config.breaks : [];
  if (breaks.length < 2) return false;
  const epochs: number[] = [];
  for (const value of breaks) {
    if (value === null) return false;
    const parsed = parseBound(value);
    if (parsed === null) return false;
    epochs.push(parsed.epochMs);
  }
  return epochs.every((epoch, index) => index === 0 || epoch > (epochs[index - 1] ?? epoch));
}

function temporalTrainingFields(input: {
  config: ColorScaleSpec | undefined;
  colorFields: readonly ChannelFieldUse[];
  temporalDecisionCache: TemporalDecisionCache;
  typeOf: (use: ChannelFieldUse) => string | null;
  evidenceOf: (use: ChannelFieldUse) => FieldEvidenceEntry | undefined;
  parser: Parameters<typeof temporalDecisionForField>[3];
  temporalOptions: Parameters<typeof temporalDecisionForField>[4];
  enabled: boolean;
}): TrainingFieldResult {
  const trainingFields = new Set<string>();
  let conflictingKind: string | null = null;
  if (!input.enabled) return { trainingFields, kindConflicts: false, conflictingKind };
  for (const use of input.colorFields) {
    if (!fieldCanTrainTemporal(input.typeOf(use))) continue;
    const decision = temporalDecisionForField(
      input.temporalDecisionCache,
      use.field,
      input.evidenceOf(use),
      input.parser,
      input.temporalOptions,
    );
    if (decision === null || decision === undefined) continue;
    if (decision.status !== "temporal" && (decision.validatedCount ?? 0) === 0) continue;
    if (
      typeof input.config?.temporalKind === "string" &&
      decision.kind !== null &&
      decision.kind !== undefined &&
      decision.kind !== input.config.temporalKind
    ) {
      conflictingKind = decision.kind;
      continue;
    }
    trainingFields.add(use.field);
  }
  return { trainingFields, kindConflicts: conflictingKind !== null, conflictingKind };
}

function fieldCanTrainTemporal(type: string | null): boolean {
  return type === "temporal" || type === "quantitative" || type === "nominal" || type === "ordinal";
}

function temporalTrainingConstants(
  values: readonly unknown[],
  parseBound: ParseBound,
  kindOk: (kind: string | undefined) => boolean,
): { constantTrains: boolean; kindConflicts: boolean; conflictingKind: string | null } {
  let constantTrains = false;
  let conflictingKind: string | null = null;
  for (const value of values) {
    const parsed = parseBound(value);
    if (parsed === null) continue;
    if (kindOk(parsed.kind)) constantTrains = true;
    else conflictingKind = parsed.kind ?? null;
  }
  return { constantTrains, kindConflicts: conflictingKind !== null, conflictingKind };
}

export function censoredTemporalColorRecovers(input: {
  config: ColorScaleSpec | undefined;
  decision: { status: string; validatedCount?: number } | null | undefined;
  field: string;
  recovery: {
    hasExplicitDomain: boolean;
    hasBinnedBreaks: boolean;
    domainBlocksRecovery: boolean;
    trainingFields: ReadonlySet<string>;
    constantTrains: boolean;
    kindConflicts: boolean;
  };
}): boolean {
  if (input.config?.parse === undefined || input.config.parseFailure !== "censor") return false;
  if (input.decision?.status !== "invalid") return false;
  // A present-but-unusable domain always throws at runtime before recovery sources apply.
  if (input.recovery.domainBlocksRecovery) return false;
  // Kind-mismatched channel values still train and throw color-temporal-kind.
  if (input.recovery.kindConflicts) return false;
  if ((input.decision.validatedCount ?? 0) > 0) return true;
  if (input.recovery.hasExplicitDomain || input.recovery.hasBinnedBreaks) return true;
  if (input.recovery.constantTrains) return true;
  for (const field of input.recovery.trainingFields) {
    if (field !== input.field) return true;
  }
  return false;
}
