/**
 * RenderModel row lookup and dispose lifecycle over retained table/scene.
 * Supports multi-table SourceRegistry global row ids (#589).
 */
import type { Scene } from "../scene.js";
import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";
import type { CandidateStore } from "../candidate-store.js";

import type { SourceRegistry } from "./source-registry.js";
import { NO_ROW } from "./types.js";

export function createRenderModelLifecycle(input: {
  scene: Scene;
  candidates: CandidateStore;
  table: ColumnTable;
  /** When present, model.row resolves multi-table global source ids. */
  sourceRegistry?: SourceRegistry | null;
}): {
  row: (index: number) => Record<string, CellValue> | null;
  dispose: () => void;
} {
  let disposed = false;
  let retainedTable: ColumnTable | null = input.table;
  let retainedRegistry: SourceRegistry | null = input.sourceRegistry ?? null;
  const { scene, candidates } = input;

  return {
    row(index: number): Record<string, CellValue> | null {
      if (index === NO_ROW || index < 0) return null;
      if (retainedRegistry !== null) return retainedRegistry.row(index);
      const source = retainedTable;
      if (source === null || index >= source.rowCount) return null;
      const out: Record<string, CellValue> = {};
      for (const field of source.fields) out[field] = source.column(field)[index]!;
      return out;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      candidates.dispose();
      retainedTable = null;
      retainedRegistry = null;
      // Release geometry (typed arrays) and per-panel structures; the bound
      // table and its numeric caches become unreachable with this model.
      scene.batches.length = 0;
      scene.panels.length = 0;
      scene.legends.length = 0;
    },
  };
}
