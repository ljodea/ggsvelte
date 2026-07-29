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
  const parseUsable = temporalParserUsable(config?.parse);
  const temporalOptionsUsable =
    (config?.timezone === undefined || typeof config.timezone === "string") &&
    (config?.disambiguation === undefined || typeof config.disambiguation === "string");
  const temporalInputsUsable = parseUsable && temporalOptionsUsable;
  const temporalOptions = {
    ...(config?.timezone !== undefined &&
      typeof config.timezone === "string" && { timezone: config.timezone }),
    ...(config?.disambiguation !== undefined &&
      typeof config.disambiguation === "string" && {
        disambiguation: config.disambiguation,
      }),
  };
  // Runtime uses config?.parse ?? "auto" in resolveColorValueView — kind-conflict
  // detection must do the same (not only when parse is explicit). parseTemporal does
  // not accept "auto", so column parsing is the shared path for both cases.
  const parser: Parameters<typeof temporalDecisionForField>[3] = config?.parse ?? "auto";
  const parseBound = (value: unknown): { epochMs: number; kind: string | undefined } | null => {
    if (!temporalInputsUsable) return null;
    if (value === null || value === undefined) return null;
    if (!(value instanceof Date) && typeof value !== "string" && typeof value !== "number") {
      return null;
    }
    const column = parseTemporalColumn(
      [value] as Parameters<typeof parseTemporalColumn>[0],
      parser,
      temporalOptions,
    );
    if (column.valid[0] !== 1) return null;
    const epochMs = column.semantic[0];
    if (epochMs === undefined || !Number.isFinite(epochMs)) return null;
    return { epochMs, kind: column.decision.kind ?? undefined };
  };

  const domainValues = Array.isArray(config?.domain)
    ? config.domain.filter((value) => value !== null)
    : [];
  const hasExplicitDomain =
    domainValues.length === 2 && domainValues.every((value) => parseBound(value) !== null);
  // Runtime throws color-domain-invalid / color-binned-domain whenever domain is
  // authored but not exactly two parseable endpoints — before siblings/breaks train.
  const domainBlocksRecovery = Array.isArray(config?.domain) && !hasExplicitDomain;

  // Do not drop null breaks: runtime maps every authored break and throws
  // color-binned-breaks when any maps to undefined.
  const authoredBreaks =
    config?.type === "binned" && Array.isArray(config.breaks) ? config.breaks : [];
  const parsedBreakEpochs: number[] = [];
  let hasBinnedBreaks = false;
  if (authoredBreaks.length >= 2) {
    let allParseable = true;
    for (const value of authoredBreaks) {
      if (value === null) {
        allParseable = false;
        break;
      }
      const parsed = parseBound(value);
      if (parsed === null) {
        allParseable = false;
        break;
      }
      parsedBreakEpochs.push(parsed.epochMs);
    }
    if (allParseable && parsedBreakEpochs.length >= 2) {
      hasBinnedBreaks = true;
      for (let index = 1; index < parsedBreakEpochs.length; index++) {
        const prev = parsedBreakEpochs[index - 1];
        const current = parsedBreakEpochs[index];
        if (prev === undefined || current === undefined || current <= prev) {
          hasBinnedBreaks = false;
          break;
        }
      }
    }
  }

  const trainingFields = new Set<string>();
  let kindConflicts = false;
  let conflictingKind: string | null = null;
  const requestsTemporal =
    config?.temporalKind !== undefined ||
    config?.parse !== undefined ||
    config?.timezone !== undefined ||
    config?.disambiguation !== undefined;
  if (temporalInputsUsable && requestsTemporal) {
    for (const use of colorFields) {
      const type = typeOf(use);
      // Always reparse under the configured parser — type:"temporal" from default
      // evidence does not mean the value trains when parse is an explicit override.
      if (
        type !== "temporal" &&
        type !== "quantitative" &&
        type !== "nominal" &&
        type !== "ordinal"
      ) {
        continue;
      }
      const decision = temporalDecisionForField(
        temporalDecisionCache,
        use.field,
        evidenceOf(use),
        parser,
        temporalOptions,
      );
      if (decision === null || decision === undefined) continue;
      const trains = decision.status === "temporal" || (decision.validatedCount ?? 0) > 0;
      if (!trains) continue;
      if (
        typeof config?.temporalKind === "string" &&
        decision.kind !== null &&
        decision.kind !== undefined &&
        decision.kind !== config.temporalKind
      ) {
        kindConflicts = true;
        conflictingKind = decision.kind;
        continue;
      }
      trainingFields.add(use.field);
    }
  }

  const kindOk = (kind: string | undefined): boolean =>
    config?.temporalKind === undefined || kind === undefined || kind === config.temporalKind;
  let constantTrains = false;
  for (const value of colorScaledConstants) {
    const parsed = parseBound(value);
    if (parsed === null) continue;
    if (kindOk(parsed.kind)) {
      constantTrains = true;
    } else {
      kindConflicts = true;
      conflictingKind = parsed.kind ?? null;
    }
  }
  return {
    hasExplicitDomain,
    hasBinnedBreaks,
    domainBlocksRecovery,
    trainingFields,
    constantTrains,
    kindConflicts,
    conflictingKind,
  };
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
