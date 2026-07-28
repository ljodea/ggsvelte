/**
 * Connect stat → LayerFrame (expand successive points for path/line).
 */
import type { ColumnTable } from "../table.js";

import { statConnect, type ConnectConnection } from "../stats/connect.js";
import { carriedColumns, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import { positionColumn } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

const CONNECTIONS = new Set<ConnectConnection>(["hv", "vh", "mid", "linear"]);

function resolveConnection(params: Record<string, unknown> | undefined): ConnectConnection {
  const raw = params?.["connection"];
  if (typeof raw === "string" && CONNECTIONS.has(raw as ConnectConnection)) {
    return raw as ConnectConnection;
  }
  return "hv";
}

export function buildConnectFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const params = (layer.params ?? {}) as Record<string, unknown>;
  // Line: expand in x order. Path: data order. Geometry must not re-sort
  // after connect (tied-x corners); dispatch uses sortByX:false for path and
  // for line when stat is connect.
  const sortByX = layer.geom === "line";
  const result = statConnect({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    y: positionColumn(table, binding.yField!, binding.yConversion, binding.yTransform),
    groups,
    connection: resolveConnection(params),
    sortByX,
    carried,
  });
  removedStatWarning(result.dropped, index, "missing or non-finite x/y before connect", warnings);
  return statLayerFrame({
    binding,
    table,
    n: result.x.length,
    x: { numeric: result.x },
    y: { numeric: result.y },
    groups: result.groups,
    inputGroups: groups,
    columns: { x: result.x, y: result.y },
    columnOf: columnOf(result, null),
    lineage: "none",
  });
}
