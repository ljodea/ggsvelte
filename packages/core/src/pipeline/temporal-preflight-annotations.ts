/** Temporal preflight for rowless annotation intercepts. */
import { parseTemporalColumn } from "@ggsvelte/spec";

import type { CellValue } from "../table.js";

import type { PositionConversionContext } from "./temporal-position.js";
import { temporalPreflightDocs } from "./temporal-preflight-shared.js";
import type { LayerBinding, PipelineWarning, ScaleDiagnostic } from "./types.js";
import { PipelineError } from "./types.js";

export function preflightTemporalAnnotations(input: {
  bindings: readonly LayerBinding[];
  warnings: PipelineWarning[];
  diagnostics: ScaleDiagnostic[];
  xConversion: PositionConversionContext;
  yConversion: PositionConversionContext;
  inferredTemporalAxes: ReadonlySet<string>;
}): void {
  const { bindings, warnings, diagnostics, xConversion, yConversion, inferredTemporalAxes } = input;
  const docs = temporalPreflightDocs;
  for (const binding of bindings) {
    if (binding.xField === null) binding.xConversion = xConversion;
    if (binding.yField === null) binding.yConversion = yConversion;
    const params = binding.layer.params as
      | { xintercept?: CellValue | CellValue[]; yintercept?: CellValue | CellValue[] }
      | undefined;
    for (const axis of ["x", "y"] as const) {
      const raw = axis === "x" ? params?.xintercept : params?.yintercept;
      if (raw === undefined) continue;
      const values = Array.isArray(raw) ? raw : [raw];
      const conversion = axis === "x" ? binding.xConversion : binding.yConversion;
      if (
        conversion.forcedDiscrete ||
        (!conversion.requestedTime &&
          conversion.parser === "auto" &&
          !inferredTemporalAxes.has(axis))
      )
        continue;
      // Annotation numbers are already-semantic epoch milliseconds. Source
      // epoch-unit parsing happens earlier for mapped columns/domains/breaks.
      const sourceValues = values.filter(
        (value) => typeof value !== "number" || !Number.isFinite(value),
      );
      if (sourceValues.length === 0) continue;
      const decision = parseTemporalColumn(
        sourceValues,
        conversion.parser,
        conversion.options,
      ).decision;
      if (
        conversion.parser === "auto" &&
        inferredTemporalAxes.has(axis) &&
        decision.status !== "temporal"
      ) {
        throw new PipelineError(
          "temporal-parse-failed",
          `/layers/${binding.index}/params/${axis}intercept`,
          `The ${axis} axis is temporal, but the annotation intercept could not be parsed unambiguously. Set a concrete intercept format or force a band scale.`,
        );
      }
      if (
        decision.kind !== null &&
        conversion.requestedKind !== undefined &&
        decision.kind !== conversion.requestedKind
      ) {
        throw new PipelineError(
          "temporal-parse-failed",
          `/layers/${binding.index}/params/${axis}intercept`,
          `The annotation parses as ${decision.kind}, not ${conversion.requestedKind}.`,
        );
      }
      if (
        conversion.parser !== "auto" &&
        decision.failedCount > 0 &&
        conversion.options.failurePolicy === "censor"
      ) {
        const message = `Temporal parser ${JSON.stringify(conversion.parser)} censored ${decision.failedCount} annotation intercept value(s) in layer ${binding.index}.`;
        warnings.push({ code: "temporal-values-censored", message });
        diagnostics.push({
          code: "temporal-values-censored",
          severity: "warning",
          path: `/layers/${binding.index}/params/${axis}intercept`,
          problem: `${decision.failedCount} temporal annotation value(s) were censored.`,
          cause: message,
          fixes: [{ description: "Correct the rejected annotation values." }],
          evidence: { failedCount: decision.failedCount },
          documentationUrl: docs("temporal-values-censored"),
        });
        continue;
      }
      if (decision.status !== "temporal") {
        const message = `The ${axis} scale requests temporal values, but ${axis}intercept in layer ${binding.index} could not be parsed strictly.`;
        throw new PipelineError(
          "temporal-parse-failed",
          `/layers/${binding.index}/params/${axis}intercept`,
          message,
          {
            code: "temporal-parse-failed",
            severity: "error",
            path: `/layers/${binding.index}/params/${axis}intercept`,
            problem: "Temporal annotation parsing failed.",
            cause: message,
            fixes: [{ description: "Correct the annotation value or choose its parser." }],
            evidence: { values: decision.evidence, failedCount: decision.failedCount },
            documentationUrl: docs("temporal-parse-failed"),
          },
        );
      }
    }
  }
}
