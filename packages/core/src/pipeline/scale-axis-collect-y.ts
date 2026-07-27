/**
 * Collect y-axis training evidence from a single layer frame.
 */
import { snapColumnToBins } from "./binned-scale.js";
import { assertInferredTemporalTransform } from "./scale-config-preflight.js";
import { isBarLike } from "./scale-axis-train.js";
import {
  positionColumn,
  positionFieldType,
  positionValueToScaleSpace,
  positionValuesToNumeric,
  yConversionOf,
} from "./temporal-position.js";
import type { AxisCollectAcc } from "./scale-axis-collect-x.js";
import type { LayerFrame } from "./types.js";

export function collectAxisInputsY(frame: LayerFrame, acc: AxisCollectAcc): void {
  const { binding } = frame;
  if (binding.yBinning !== undefined) {
    acc.numeric.push(Float64Array.from(binding.yBinning.edges));
  }
  const geom = binding.layer.geom;
  const yConversion = yConversionOf(binding);

  // Dotplot stackdir "up"/"down" benefit from a zero baseline so the first
  // stack row sits on the axis (ggplot2 count-unit stacks).
  if (isBarLike(geom) || geom === "density" || geom === "dotplot") acc.barMeasure = true;
  // geom_violin stashes unitless violinwidth (0-1) in ymin/ymax for the
  // geometry to widen polygons; those are not y positions, so training on them
  // would shrink the axis to 0-1 and throw every polygon off-panel (#798).
  if (geom === "violin") {
    if (frame.yNumeric !== null) acc.numeric.push(frame.yNumeric);
    if (binding.yField !== null) {
      const fieldType = positionFieldType(frame.table, binding.yField, yConversion);
      acc.typeParts.add(fieldType);
      if (fieldType === "nominal") acc.anyDiscrete = true;
      if (fieldType !== "temporal") acc.allTemporal = false;
    }
    return;
  }
  if (frame.ymin !== null && frame.ymax !== null) {
    acc.numeric.push(frame.ymin, frame.ymax);
    // Bands need not cover the center line (se: false smooths have
    // NaN bands; the summary center can escape min/max bounds).
    // pointrange/crossbar draw the center (point / mid line), so train it too.
    if (
      (geom === "smooth" || geom === "errorbar" || geom === "pointrange" || geom === "crossbar") &&
      frame.yNumeric !== null
    ) {
      acc.numeric.push(frame.yNumeric);
    }
    if (frame.box !== null) acc.numeric.push(frame.box.outlierY);
    // Tile/raster y edges are synthetic from centers — type evidence from
    // yField only so inherited ymin/ymax cannot poison inference.
    const boundFields =
      geom === "tile" || geom === "raster"
        ? []
        : [binding.yminField, binding.ymaxField].filter((field): field is string => field !== null);
    const evidenceFields = [
      ...new Set(
        boundFields.length > 0 ? boundFields : binding.yField === null ? [] : [binding.yField],
      ),
    ];
    if (evidenceFields.length === 0) {
      acc.typeParts.add("quantitative");
      acc.allTemporal = false;
    } else {
      for (const field of evidenceFields) {
        const fieldType = positionFieldType(frame.table, field, yConversion);
        acc.typeParts.add(fieldType);
        if (fieldType === "nominal") acc.anyDiscrete = true;
        if (fieldType !== "temporal") acc.allTemporal = false;
      }
    }
    acc.sawContinuousEvidence = true;
  } else if (binding.yStatColumn !== null && frame.yNumeric !== null) {
    acc.numeric.push(frame.yNumeric);
    acc.typeParts.add(binding.yStatColumn);
    acc.allTemporal = false;
    acc.sawContinuousEvidence = true;
  } else if (binding.yField !== null) {
    // Panel-local data: free-y facets train each panel on ITS rows. Read in
    // scale-space so evidence matches the transformed frame arrays and trainer.
    const column = frame.table.column(binding.yField);
    acc.columns.push(column);
    acc.numeric.push(
      snapColumnToBins(
        positionColumn(frame.table, binding.yField, yConversion, binding.yTransform),
        binding.yBinning,
      ),
    );
    const fieldType = positionFieldType(frame.table, binding.yField, yConversion);
    acc.typeParts.add(fieldType);
    if (fieldType === "nominal") acc.anyDiscrete = true;
    if (fieldType !== "temporal") acc.allTemporal = false;
    acc.sawContinuousEvidence = true;
  } else if (frame.yNumeric !== null) {
    // Synthesized continuous y without aes.y (geom_map vertices; qq/qq_line sample quantiles).
    acc.numeric.push(frame.yNumeric);
    acc.typeParts.add("quantitative");
    acc.allTemporal = false;
    acc.sawContinuousEvidence = true;
  }
  // Segment end y: dual evidence (numeric + discrete) even when yField is set.
  // Guard undefined partial fixtures (not only null).
  if (frame.yend !== null && frame.yend !== undefined) {
    acc.numeric.push(frame.yend);
    if (frame.yendValues !== null && frame.yendValues !== undefined) {
      acc.columns.push(frame.yendValues);
    }
    const endField = binding.yendField;
    if (endField !== null && frame.table.has(endField)) {
      const endType = positionFieldType(frame.table, endField, yConversion);
      acc.typeParts.add(endType);
      if (endType === "nominal") acc.anyDiscrete = true;
      if (endType !== "temporal") acc.allTemporal = false;
    } else {
      acc.typeParts.add("quantitative");
      acc.allTemporal = false;
    }
    acc.sawContinuousEvidence = true;
  }
  for (const v of frame.yIntercepts) {
    acc.columns.push([v]);
    const converted = positionValuesToNumeric([v], yConversion);
    const numeric = converted.values[0] ?? Number.NaN;
    const temporal =
      converted.decision.status === "temporal" ||
      (yConversion.parser !== "auto" && Number.isFinite(numeric));
    if (temporal && !(yConversion.forcedNonTemporal && Number.isFinite(numeric))) {
      assertInferredTemporalTransform(
        "y",
        binding.yTransform === undefined
          ? undefined
          : { transform: binding.yTransform.transform.key },
        true,
      );
    }
    acc.numeric.push(
      Float64Array.of(positionValueToScaleSpace(v, yConversion, binding.yTransform)),
    );
    if (!temporal) acc.allTemporal = false;
    if (typeof v === "string" && !Number.isFinite(numeric)) acc.anyDiscrete = true;
    acc.sawContinuousEvidence = true;
  }
}
