/**
 * assembleRenderModel input contract.
 */
import type { PanelCoordProjector } from "../coord-projector.js";
import type { TickFormatter } from "../layout/layout.js";
import type { GuidePlan } from "../layout/temporal-guide.js";
import type { ResolvedStyleScale } from "../scales/style.js";
import type { ScaleState } from "../scales/state.js";
import type { PositionScale } from "../scales/train.js";
import type { Scene } from "../scene.js";
import type { CellValue, ColumnTable } from "../table.js";
import type { CandidateStore } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";

import type { SourceRegistry } from "./source-registry.js";
import type { PositionConversionContext } from "./temporal-position.js";
import type {
  Advisory,
  LayerBackend,
  MappedField,
  PipelineWarning,
  ResolvedColorScale,
  ScaleDecision,
  ScaleDiagnostic,
  ScaleDomainSnapshot,
} from "./types.js";

export interface AssembleRenderModelInput {
  scene: Scene;
  xScale: PositionScale;
  yScale: PositionScale;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  styles: Record<string, ResolvedStyleScale | null>;
  panelScales: { x: PositionScale; y: PositionScale }[];
  colorState: ScaleState | null;
  fillState: ScaleState | null;
  styleStates: Record<string, ScaleState | null>;
  warnings: PipelineWarning[];
  advisories: Advisory[];
  scaleDecisions: ScaleDecision[];
  scaleDiagnostics: ScaleDiagnostic[];
  guidePlans: readonly GuidePlan[];
  coordProjectors: readonly PanelCoordProjector[];
  flipped: boolean;
  xConversion: PositionConversionContext;
  yConversion: PositionConversionContext;
  runId: number;
  layerBackends: LayerBackend[];
  layerFields: MappedField[][];
  layerScaledConstants: ReadonlyArray<Readonly<Partial<Record<string, CellValue>>>>;
  baselineDomains: ScaleDomainSnapshot;
  effectiveDomains: ScaleDomainSnapshot;
  lineage: LineageStore<number>;
  candidates: CandidateStore;
  formatX: TickFormatter | undefined;
  formatY: TickFormatter | undefined;
  table: ColumnTable;
  /** Multi-table global row registry (#589). When set, model.row uses it. */
  sourceRegistry?: SourceRegistry | null;
}
