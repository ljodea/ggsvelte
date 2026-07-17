/**
 * Shared plot services extracted from GGPlot: live-region announcer and
 * semantic-key resolution (keys, diagnostics, legend index).
 *
 * Pure refactor hosts: move bodies verbatim; no behavior change.
 */
import type { CandidateFacts, CellValue, RenderModel } from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";

import type { InteractionDiagnostic } from "./interaction.js";
import {
  buildLegendEntryKeyIndexForPlot,
  keysForLegendEntry,
  type LegendEntryAction,
} from "./plot-legend-focus.js";
import { resolveSemanticKeysForPlot } from "./plot-semantic-keys.js";
import { rowIndexesForCandidate, uniqueKeysFromRowIndexes } from "./plot-selection.js";

// ---------------------------------------------------------------------------
// Announcer
// ---------------------------------------------------------------------------

export type PlotAnnouncer = {
  readonly text: string;
  announce(message: string): void;
  clear(): void;
};

/**
 * Owns the interaction live-region string: clear then set after a microtask
 * so re-announcements of the same message still fire for assistive tech.
 * `clear` is synchronous and queues nothing — a queued blank would run after
 * (and swallow) a message announced earlier in the same tick.
 */
export function createPlotAnnouncer(): PlotAnnouncer {
  let interactionAnnouncement = $state("");
  return {
    get text(): string {
      return interactionAnnouncement;
    },
    announce(message: string): void {
      interactionAnnouncement = "";
      queueMicrotask(() => {
        interactionAnnouncement = message;
      });
    },
    clear(): void {
      interactionAnnouncement = "";
    },
  };
}

// ---------------------------------------------------------------------------
// Semantic keys
// ---------------------------------------------------------------------------

export type SemanticKeyServiceDeps = {
  model: () => RenderModel | null;
  assembled: () => PortableSpec | null;
  datumKey: () =>
    | string
    | number
    | symbol
    | ((row: never, index: number) => PropertyKey)
    | undefined;
  data: () => unknown;
  spec: () => unknown;
  sourceIdentity: (value: unknown) => string;
  deliverDiagnostic: (diagnostic: InteractionDiagnostic) => void;
};

export type SemanticKeyService = {
  semanticKey(row: Record<string, CellValue> | null, index: number | null): PropertyKey | null;
  candidateSemanticKeys(candidate: CandidateFacts): PropertyKey[];
  readonly legendEntryKeyIndex: ReadonlyMap<string, readonly PropertyKey[]>;
  keysForLegend(action: LegendEntryAction): readonly PropertyKey[];
  /** Direct map lookup (inspection coordinator / mask paths). */
  keyAt(index: number): PropertyKey | null;
  /** Register diagnostics delivery at the host's original effect position. */
  registerEffects(): void;
};

/**
 * Owns priorKeys, semantic key resolution, diagnostics delivery, and the
 * legend entry → key index. Construction may happen as soon as the runtime
 * model exists; call `registerEffects` at the original GGPlot registration
 * site so the diagnostics `$effect` keeps its relative order.
 */
export function createSemanticKeyService(deps: SemanticKeyServiceDeps): SemanticKeyService {
  // Owned for the component lifetime; resolveSemanticKeys mutates in place.
  const priorKeys = new Map<string, PropertyKey>();

  const semanticKeys = $derived.by(() => {
    const model = deps.model();
    return resolveSemanticKeysForPlot({
      model:
        model === null
          ? null
          : {
              candidates: model.candidates,
              lineage: model.lineage,
              row: (rowIndex) => model.row(rowIndex),
            },
      layers: deps.assembled()?.layers ?? [],
      datumKey: deps.datumKey(),
      priorKeys,
      dataToken: deps.sourceIdentity(deps.data()),
      specToken: deps.sourceIdentity(deps.spec()),
    });
  });

  function registerEffects(): void {
    $effect(() => {
      for (const diagnostic of semanticKeys.diagnostics) deps.deliverDiagnostic(diagnostic);
    });
  }

  function semanticKey(
    row: Record<string, CellValue> | null,
    index: number | null,
  ): PropertyKey | null {
    if (row === null || index === null || deps.datumKey() === undefined) return null;
    return semanticKeys.keys.get(index) ?? null;
  }

  function candidateSemanticKeys(candidate: CandidateFacts): PropertyKey[] {
    const model = deps.model();
    if (model === null) return [];
    const rows = rowIndexesForCandidate(candidate, model.lineage.keys(candidate.lineage));
    return uniqueKeysFromRowIndexes(rows, (rowIndex) => semanticKey(model.row(rowIndex), rowIndex));
  }

  const legendEntryKeyIndex: ReadonlyMap<string, readonly PropertyKey[]> = $derived.by(() => {
    const model = deps.model();
    return buildLegendEntryKeyIndexForPlot({
      model:
        model === null
          ? null
          : {
              scene: model.scene,
              candidates: model.candidates,
              layerFields: model.layerFields,
              layerScaledConstants: model.layerScaledConstants,
              lineage: model.lineage,
              row: (rowIndex) => model.row(rowIndex),
            },
      semanticKey: (rowIndex) => semanticKeys.keys.get(rowIndex),
    });
  });

  function keysForLegend(action: LegendEntryAction): readonly PropertyKey[] {
    return keysForLegendEntry(legendEntryKeyIndex, action.identity);
  }

  return {
    semanticKey,
    candidateSemanticKeys,
    get legendEntryKeyIndex() {
      return legendEntryKeyIndex;
    },
    keysForLegend,
    keyAt(index: number): PropertyKey | null {
      return semanticKeys.keys.get(index) ?? null;
    },
    registerEffects,
  };
}
