/**
 * Agent path validation: inline → validate → normalize → limits → seed bounds.
 * Keeps raw SpecError[] for the repair payload (never strips allowed/fix.example).
 */

import { normalize, validate, type PortableSpec, type SpecError } from "@ggsvelte/spec";

import {
  PLAYGROUND_MAX_DECODED_BYTES,
  PLAYGROUND_MAX_DEPTH,
  PLAYGROUND_MAX_ROWS,
  PlaygroundCodecError,
  validatePlaygroundSeed,
  type PlaygroundSeedV1,
} from "./playground-codec";
import { inlinePlaygroundDatasetRows } from "./playground-datasets";
import {
  chartHasDiscreteLegend,
  coerceInteractionsForChart,
  type PlaygroundAgentEnvelope,
  type PlaygroundInteractions,
} from "./playground-agent-envelope";
import type { PlaygroundDatasetId } from "./playground-dataset-schemas";

const VALIDATE_LIMITS = {
  maxRows: PLAYGROUND_MAX_ROWS,
  maxBytes: PLAYGROUND_MAX_DECODED_BYTES,
  maxDepth: PLAYGROUND_MAX_DEPTH,
  maxDiagnostics: 100,
} as const;

export type AgentValidateResult =
  | {
      readonly ok: true;
      readonly spec: PortableSpec;
      readonly seed: PlaygroundSeedV1;
      readonly interactions: PlaygroundInteractions;
      readonly title: string | null;
    }
  | {
      readonly ok: false;
      readonly errors: readonly SpecError[];
      readonly message: string;
    };

export function validateAgentEnvelope(
  envelope: PlaygroundAgentEnvelope,
  datasetId: PlaygroundDatasetId,
): AgentValidateResult {
  const shape = validate(envelope.spec);
  if (!shape.ok) {
    return {
      ok: false,
      errors: shape.errors,
      message: shape.errors[0]?.message ?? "Spec shape validation failed.",
    };
  }

  const inlined = inlinePlaygroundDatasetRows(shape.spec, datasetId);
  const normalized = normalize(inlined);
  const checked = validate(normalized, { limits: VALIDATE_LIMITS });
  if (!checked.ok) {
    return {
      ok: false,
      errors: checked.errors,
      message: checked.errors[0]?.message ?? "Spec limits validation failed.",
    };
  }

  let titled = checked.spec;
  if (envelope.title !== null && envelope.title !== "") {
    titled = {
      ...checked.spec,
      labs: {
        ...checked.spec.labs,
        title: envelope.title,
      },
    };
  }

  const seed: PlaygroundSeedV1 = {
    version: 1,
    source: { kind: "custom" },
    spec: titled,
  };

  try {
    validatePlaygroundSeed(seed);
  } catch (error) {
    const message =
      error instanceof PlaygroundCodecError || error instanceof Error
        ? error.message
        : "Spec exceeds playground share limits.";
    // Seed bounds are not SpecError codes — surface as empty repair list + message.
    return {
      ok: false,
      errors: [],
      message,
    };
  }

  const interactions = coerceInteractionsForChart(
    envelope.interactions,
    chartHasDiscreteLegend(titled),
  );

  return {
    ok: true,
    spec: titled,
    seed,
    interactions,
    title: envelope.title,
  };
}
