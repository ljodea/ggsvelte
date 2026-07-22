/**
 * Uncensored natural baseline domains when effective scale domain pins censor
 * pre-stat frames (#449). Mirrors the Svelte runtime double-pass: train
 * baseline from data without position domain pins so zoom-out is not starved.
 */
import type { PortableSpec, PositionScaleSpec } from "@ggsvelte/spec";

import { computeEffectiveDomains } from "./compute-domains.js";
import { preparePanels } from "./prepare-panels.js";
import { trainPipelineScales } from "./train-pipeline-scales.js";
import type { EditionDefaults } from "../editions.js";
import type { Advisory, PipelineWarning, RunOptions, ScaleDomainSnapshot } from "./types.js";

/** True when either positional scale carries an explicit continuous domain pin. */
export function hasPinnedPositionDomain(scales: PortableSpec["scales"] | undefined): boolean {
  return (
    (scales?.x?.domain !== undefined && scales.x.domain.length >= 2) ||
    (scales?.y?.domain !== undefined && scales.y.domain.length >= 2)
  );
}

function stripPositionDomain(config: PositionScaleSpec): PositionScaleSpec {
  const { domain: _domain, ...rest } = config;
  return rest;
}

/** Clone PortableSpec scales without x/y `domain` (keep type/nice/breaks/etc.). */
export function withoutPositionDomains(spec: PortableSpec): PortableSpec {
  if (spec.scales === undefined) return spec;
  const scales = { ...spec.scales };
  if (scales.x !== undefined) scales.x = stripPositionDomain(scales.x);
  if (scales.y !== undefined) scales.y = stripPositionDomain(scales.y);
  return { ...spec, scales };
}

/**
 * Train natural baseline domains from an uncensored prepare+train pass.
 * Diagnostics from the baseline pass are discarded (effective run owns them).
 */
export function trainUncensoredBaselineDomains(input: {
  normalized: PortableSpec;
  options: RunOptions;
  editionDefaults: EditionDefaults;
}): ScaleDomainSnapshot {
  const unpinned = withoutPositionDomains(input.normalized);
  // Baseline pass owns no product diagnostics — effective run reports them.
  const scratchWarnings: PipelineWarning[] = [];
  const scratchAdvisories: Advisory[] = [];
  const prepared = preparePanels(unpinned, input.options, scratchWarnings, scratchAdvisories);
  // Avoid nested baseline training on the uncensored pass.
  const {
    baselineScales: _baselineScales,
    baselineDomains: _baselineDomains,
    ...restOptions
  } = input.options;
  const trainOptions: RunOptions = restOptions;
  const trained = trainPipelineScales({
    normalized: unpinned,
    options: trainOptions,
    table: prepared.table,
    sourceTable: prepared.sourceTable,
    bindings: prepared.bindings,
    facetPanels: prepared.facetPanels,
    panelFrames: prepared.panelFrames,
    freeX: prepared.freeX,
    freeY: prepared.freeY,
    xConversion: prepared.xConversion,
    yConversion: prepared.yConversion,
    editionDefaults: input.editionDefaults,
    warnings: scratchWarnings,
    advisories: scratchAdvisories,
  });
  return computeEffectiveDomains(
    trained.xTraining.scale,
    trained.yTraining.scale,
    trained.panelScales,
  );
}

/** Whether runPipeline should inject an uncensored baselineDomains snapshot. */
export function needsUncensoredBaselinePass(
  options: RunOptions,
  scales: PortableSpec["scales"],
): boolean {
  return (
    options.baselineScales !== undefined &&
    options.baselineDomains === undefined &&
    hasPinnedPositionDomain(scales)
  );
}
