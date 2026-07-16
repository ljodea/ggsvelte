/**
 * Identity candidate attribute shape (series, mode, lineage, annotation).
 */
import type { CellValue } from "../table.js";

import type { candidateAutoMode } from "./frame.js";

export interface IdentityCandidateAttrs {
  group: number;
  seriesRank: number;
  autoMode: ReturnType<typeof candidateAutoMode>;
  sourceOrder: number;
  lineageKey: number;
  annotationRule: boolean;
  annotationX: CellValue;
  annotationY: CellValue;
}
