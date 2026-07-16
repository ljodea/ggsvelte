/**
 * Resolve NamedData / dataset refs into ColumnTables for the pipeline.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { Columns, Rows } from "../table.js";
import { ColumnTable } from "../table.js";

import type { NamedData, RunOptions } from "./types.js";
import { PipelineError } from "./types.js";

function tableFromNamed(data: NamedData): ColumnTable {
  if (Array.isArray(data)) return ColumnTable.fromRows(data);
  if ("values" in data && Array.isArray((data as { values: unknown }).values)) {
    return ColumnTable.fromRows((data as { values: Rows }).values);
  }
  if ("columns" in data && typeof (data as { columns: unknown }).columns === "object") {
    return ColumnTable.fromColumns((data as { columns: Columns }).columns);
  }
  return ColumnTable.fromColumns(data as Columns);
}

export function bindData(spec: PortableSpec, options: RunOptions): ColumnTable {
  const ref = spec.data;
  if (ref === undefined) {
    throw new PipelineError(
      "no-data",
      "/data",
      "The spec has no data. Provide spec.data ({values}, {columns}, or {name}) or layer data.",
    );
  }
  if ("values" in ref) return ColumnTable.fromRows(ref.values);
  if ("columns" in ref) return ColumnTable.fromColumns(ref.columns);
  const name = ref.name;
  const fromSpec = spec.datasets?.[name];
  const fromRun = options.data?.[name];
  if (fromSpec !== undefined && fromRun !== undefined && options.allowOverride !== true) {
    throw new PipelineError(
      "dataset-collision",
      "/data/name",
      `Dataset "${name}" is defined in both spec.datasets and RunOptions.data. ` +
        "Pass allowOverride: true to let the runtime data win, or rename one.",
    );
  }
  if (fromRun !== undefined && (fromSpec === undefined || options.allowOverride === true)) {
    return tableFromNamed(fromRun);
  }
  if (fromSpec !== undefined) return tableFromNamed(fromSpec);
  const available = [...Object.keys(spec.datasets ?? {}), ...Object.keys(options.data ?? {})];
  throw new PipelineError(
    "unknown-dataset",
    "/data/name",
    `Unknown dataset "${name}". Available: ${available.length > 0 ? available.join(", ") : "none"}.`,
  );
}
