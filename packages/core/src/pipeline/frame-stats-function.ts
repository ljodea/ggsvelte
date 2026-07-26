/**
 * Function stat → LayerFrame (path/line from evaluated y = f(x) grid).
 */
import { statFunction } from "../stats/function.js";
import type { ColumnTable } from "../table.js";
import { finiteExtent } from "../scales/train.js";

import { emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf, styleColumns } from "./frame-stats-shared.js";
import { forwardMeasureOnce } from "./stat-measure-transform.js";
import { positionColumn } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

function ownXDomain(binding: LayerBinding, table: ColumnTable): [number, number] | null {
  if (binding.xField === null || !table.has(binding.xField)) return null;
  return (
    finiteExtent([
      positionColumn(table, binding.xField, binding.xConversion, binding.xTransform),
    ]) ?? null
  );
}

export function buildFunctionFrame(
  binding: LayerBinding,
  table: ColumnTable,
  warnings: PipelineWarning[],
  /** Peer-layer continuous x extent when xlim is omitted. */
  peerDomain?: [number, number],
): LayerFrame {
  const { layer, index } = binding;
  const params = (layer.params ?? {}) as {
    fun?: string;
    n?: number;
    xlim?: [number, number] | number[];
    args?: { mean?: number; sd?: number; a?: number; b?: number };
  };
  const own = ownXDomain(binding, table);
  const domain = own ?? peerDomain ?? null;
  const result = statFunction({ params, domain });

  if (result.domainMissing) {
    warnings.push({
      code: "function-domain-missing",
      message: `Layer ${index} (function): could not resolve an x evaluation domain. Set params.xlim to [min, max], map continuous aes.x, or add another layer that trains x.`,
    });
  }
  if (typeof params.fun !== "string" || params.fun.length === 0) {
    warnings.push({
      code: "function-fun-missing",
      message: `Layer ${index} (function): params.fun is required (registry: identity, dnorm, pnorm, linear).`,
    });
  } else {
    const known = ["identity", "dnorm", "pnorm", "linear"];
    if (!known.includes(params.fun) && !result.domainMissing) {
      warnings.push({
        code: "function-fun-unknown",
        message: `Layer ${index} (function): unknown fun "${params.fun}". Known: ${known.join(", ")}.`,
      });
    }
  }

  removedStatWarning(0, index, "function evaluation", warnings);
  const columnOf = makeColumnOf(binding)(result, null);
  const yNumeric = forwardMeasureOnce(result.y, binding.yTransform);
  const outN = result.x.length;
  return {
    binding,
    table,
    n: outN,
    xValues: null,
    xNumeric: result.x,
    yValues: null,
    yNumeric,
    groups: result.groups,
    inputGroups: [],
    inputSourceRows: null,
    rowIndex: Uint32Array.from({ length: outN }, () => NO_ROW),
    colorValues: columnOf(binding.color.field),
    fillValues: columnOf(binding.fill.field),
    ...styleColumns(binding, columnOf),
    labelValues: columnOf(binding.labelField),
    ...emptyFrameExtras(),
  };
}
