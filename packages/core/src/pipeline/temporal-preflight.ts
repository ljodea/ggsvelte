import {
  parseTemporalColumn,
  TEMPORAL_PARSER_NAMES,
  temporalParserConfigurationError,
  type PositionScaleSpec,
  type TemporalParserName,
} from "@ggsvelte/spec";

import type { CellValue, ColumnTable } from "../table.js";

import type { PositionConversionContext } from "./temporal-position.js";
import type {
  Advisory,
  LayerBinding,
  PipelineWarning,
  ScaleDecision,
  ScaleDiagnostic,
} from "./types.js";
import { PipelineError } from "./types.js";

export interface TemporalPreflightResult {
  decisions: ScaleDecision[];
  diagnostics: ScaleDiagnostic[];
  xConversion: PositionConversionContext;
  yConversion: PositionConversionContext;
}

function docs(code: string): string {
  return `https://ljodea.github.io/ggsvelte/guide/errors#${code}`;
}

export function assertTemporalConfiguration(
  axis: "x" | "y",
  conversion: PositionConversionContext,
): void {
  if (conversion.forcedDiscrete) return;
  const configurationError = temporalParserConfigurationError(
    conversion.parser,
    conversion.options,
  );
  if (configurationError === null) return;
  const message = `The ${axis} scale has invalid temporal parser configuration: ${configurationError}.`;
  throw new PipelineError("temporal-parse-failed", `/scales/${axis}`, message, {
    code: "temporal-parse-failed",
    severity: "error",
    path: `/scales/${axis}`,
    problem: "Temporal parser configuration is invalid.",
    cause: message,
    fixes: [{ description: "Correct the parser format or timezone configuration." }],
    documentationUrl: docs("temporal-parse-failed"),
  });
}

export function preflightTemporalBindings(input: {
  table: ColumnTable;
  bindings: readonly LayerBinding[];
  warnings: PipelineWarning[];
  advisories: Advisory[];
  conversions: Readonly<{ x: PositionConversionContext; y: PositionConversionContext }>;
}): TemporalPreflightResult {
  const { table, bindings, warnings, advisories, conversions } = input;
  const resolvedByKey = new Map<string, PositionConversionContext>();
  const decisions: ScaleDecision[] = [];
  const diagnostics: ScaleDiagnostic[] = [];

  for (const binding of bindings) {
    const processAxis = (axis: "x" | "y"): void => {
      const axisConversion = axis === "x" ? binding.xConversion : binding.yConversion;
      if (axisConversion.forcedDiscrete) return;
      assertTemporalConfiguration(axis, axisConversion);
      const fields =
        axis === "x" ? [binding.xField] : [binding.yField, binding.yminField, binding.ymaxField];
      const fieldResolutions: PositionConversionContext[] = [];
      for (const field of new Set(fields)) {
        if (field === null || !table.has(field)) continue;
        const conversion = axisConversion;
        const key = `${axis}|${field}|${conversion.parser === "auto" ? "auto" : JSON.stringify(conversion.parser)}|${JSON.stringify(conversion.options)}`;
        const cachedResolution = resolvedByKey.get(key);
        if (cachedResolution !== undefined) {
          fieldResolutions.push(cachedResolution);
          continue;
        }

        const view = table.parsed(field, conversion.sourceParser, conversion.options);
        const decision = view.decision;
        const explicit = conversion.parser !== "auto";
        if (explicit && decision.failedCount > 0) {
          const sample = decision.failures?.[0];
          const message =
            `Temporal parser ${JSON.stringify(conversion.parser)} rejected ${decision.failedCount} value(s) in field "${field}".` +
            (sample === undefined
              ? ""
              : ` First failure at row ${sample.index}: ${JSON.stringify(sample.value)} (${sample.reason}).`);
          if (conversion.options.failurePolicy === "censor") {
            warnings.push({ code: "temporal-values-censored", message });
            diagnostics.push({
              code: "temporal-values-censored",
              severity: "warning",
              path: `/scales/${axis}/parse`,
              problem: `${decision.failedCount} temporal value(s) were censored.`,
              cause: message,
              fixes: [
                { description: "Correct the rejected values or choose the matching parser." },
                {
                  description: "Use strict failure handling.",
                  portable: { scales: { [axis]: { parseFailure: "error" } } },
                },
              ],
              evidence: {
                ...(decision.failures !== undefined && {
                  values: decision.failures.map((failure) => failure.value),
                }),
                failedCount: decision.failedCount,
              },
              documentationUrl: docs("temporal-values-censored"),
            });
          } else {
            throw new PipelineError("temporal-parse-failed", `/scales/${axis}/parse`, message, {
              code: "temporal-parse-failed",
              severity: "error",
              path: `/scales/${axis}/parse`,
              problem: `Temporal parsing failed for ${decision.failedCount} value(s).`,
              cause: message,
              fixes: [
                { description: "Correct the rejected values or choose the matching parser." },
                {
                  description: "Censor rejected values explicitly.",
                  portable: { scales: { [axis]: { parseFailure: "censor" } } },
                },
              ],
              evidence: {
                ...(decision.failures !== undefined && {
                  values: decision.failures.map((failure) => failure.value),
                }),
                failedCount: decision.failedCount,
              },
              documentationUrl: docs("temporal-parse-failed"),
            });
          }
        } else if (conversion.requestedTime && decision.status !== "temporal") {
          const candidates =
            decision.candidates.length > 0 ? ` Candidates: ${decision.candidates.join(", ")}.` : "";
          const message = `The ${axis} scale requests temporal values, but field "${field}" could not be parsed strictly.${candidates} Set scales.${axis}.parse explicitly or use type: "band".`;
          throw new PipelineError("temporal-parse-failed", `/scales/${axis}/parse`, message, {
            code: "temporal-parse-failed",
            severity: "error",
            path: `/scales/${axis}/parse`,
            problem: `Field "${field}" could not satisfy the requested temporal scale.`,
            cause: message,
            fixes: [
              {
                description: "Choose an explicit temporal parser.",
                portable: { scales: { [axis]: { type: "time", parse: "dmy" } } },
              },
              {
                description: "Keep the field discrete.",
                portable: { scales: { [axis]: { type: "band" } } },
              },
            ],
            evidence: { values: decision.evidence, candidates: decision.candidates },
            documentationUrl: docs("temporal-parse-failed"),
          });
        }
        if (
          decision.kind !== null &&
          conversion.requestedKind !== undefined &&
          decision.kind !== conversion.requestedKind
        ) {
          const message = `The ${axis} scale requests ${conversion.requestedKind} values, but field "${field}" parses as ${decision.kind}. Choose the matching date/datetime scale or parser.`;
          throw new PipelineError(
            "temporal-parse-failed",
            `/scales/${axis}/temporalKind`,
            message,
            {
              code: "temporal-parse-failed",
              severity: "error",
              path: `/scales/${axis}/temporalKind`,
              problem: `Field "${field}" does not match temporalKind "${conversion.requestedKind}".`,
              cause: message,
              fixes: [
                { description: `Use temporalKind "${decision.kind}" for this field.` },
                {
                  description: `Choose a parser that produces ${conversion.requestedKind} values.`,
                },
              ],
              evidence: { values: decision.evidence },
              documentationUrl: docs("temporal-parse-failed"),
            },
          );
        }

        if (!explicit && decision.status === "temporal" && decision.parser === "year") {
          advisories.push({
            code: "temporal-year-inferred",
            path: `scales.${axis}`,
            chosen: `four-digit strings in "${field}" treated as calendar years`,
            howToOverride: `Use scale${axis.toUpperCase()}Discrete() or set scales.${axis}.type to "band" for year-like identifiers.`,
          });
          diagnostics.push({
            code: "temporal-year-inferred",
            severity: "advisory",
            path: `/scales/${axis}`,
            problem: `Four-digit strings in "${field}" were interpreted as calendar years.`,
            cause:
              "Value-only evidence cannot distinguish calendar years from four-digit identifiers.",
            fixes: [
              {
                description: "Keep the values as discrete identifiers.",
                portable: { scales: { [axis]: { type: "band" } } },
                typescript: `.scale${axis.toUpperCase()}Discrete()`,
              },
            ],
            evidence: { values: decision.evidence },
            documentationUrl: docs("temporal-year-inferred"),
          });
        } else if (!conversion.requestedTime && decision.status === "ambiguous") {
          advisories.push({
            code: "temporal-inference-ambiguous",
            path: `scales.${axis}`,
            chosen: `field "${field}" kept discrete because date order is ambiguous (${decision.candidates.join(", ")})`,
            howToOverride: `Set scales.${axis}.parse to the intended order, such as "dmy" or "mdy".`,
          });
          diagnostics.push({
            code: "temporal-inference-ambiguous",
            severity: "advisory",
            path: `/scales/${axis}`,
            problem: `Field "${field}" was kept discrete because its date order is ambiguous.`,
            cause: `The sampled values match multiple parser orders: ${decision.candidates.join(", ")}.`,
            fixes: decision.candidates.map((parser) => ({
              description: `Parse with ${parser}.`,
              portable: { scales: { [axis]: { type: "time", parse: parser } } },
            })),
            evidence: { values: decision.evidence, candidates: decision.candidates },
            documentationUrl: docs("temporal-inference-ambiguous"),
          });
        } else if (!conversion.requestedTime && decision.status === "invalid") {
          advisories.push({
            code: "temporal-inference-invalid",
            path: `scales.${axis}`,
            chosen: `field "${field}" kept discrete because ${decision.failedCount} value(s) failed whole-column temporal validation`,
            howToOverride: `Correct the values, set scales.${axis}.parse explicitly, or force type: "band".`,
          });
          diagnostics.push({
            code: "temporal-inference-invalid",
            severity: "advisory",
            path: `/scales/${axis}`,
            problem: `Field "${field}" was kept discrete after whole-column validation failed.`,
            cause: `${decision.failedCount} value(s) did not match the sampled temporal family.`,
            fixes: [
              { description: "Correct the rejected values or supply an explicit parser." },
              {
                description: "Keep the field discrete.",
                portable: { scales: { [axis]: { type: "band" } } },
              },
            ],
            evidence: {
              ...(decision.failures !== undefined && {
                values: decision.failures.map((failure) => failure.value),
              }),
              failedCount: decision.failedCount,
            },
            documentationUrl: docs("temporal-inference-invalid"),
          });
        }

        const inferredParser = TEMPORAL_PARSER_NAMES.find(
          (candidate): candidate is TemporalParserName => candidate === decision.parser,
        );
        if (
          decision.status === "temporal" ||
          decision.status === "ambiguous" ||
          decision.status === "invalid" ||
          conversion.requestedTime
        ) {
          const portableParser = conversion.parser === "auto" ? inferredParser : conversion.parser;
          const portableOverride: PositionScaleSpec =
            decision.status === "temporal"
              ? {
                  type: "time",
                  ...(decision.kind !== null && { temporalKind: decision.kind }),
                  ...(portableParser === undefined ? {} : { parse: portableParser }),
                }
              : { type: "band" };
          decisions.push({
            aesthetic: axis,
            field,
            status: decision.status === "temporal" ? "temporal" : "nominal",
            parser: decision.status === "temporal" ? decision.parser : null,
            kind: decision.kind,
            precision: decision.precision,
            evidence: decision.evidence,
            validatedCount: decision.validatedCount,
            ambiguity: decision.status === "ambiguous" ? decision.candidates : [],
            portableOverride,
          });
        }

        const resolvedConversion: PositionConversionContext =
          conversion.parser === "auto" &&
          decision.status === "temporal" &&
          inferredParser !== undefined
            ? Object.freeze({
                ...conversion,
                parser: inferredParser,
                options: Object.freeze({ ...conversion.options }),
              })
            : conversion;
        resolvedByKey.set(key, resolvedConversion);
        fieldResolutions.push(resolvedConversion);
      }
      const uniqueResolutions = new Map(
        fieldResolutions.map((resolution) => [JSON.stringify(resolution), resolution]),
      );
      const resolvedAxisConversion =
        uniqueResolutions.size === 1 ? uniqueResolutions.values().next().value! : axisConversion;
      if (axis === "x") binding.xConversion = resolvedAxisConversion;
      else binding.yConversion = resolvedAxisConversion;
    };
    for (const axis of ["x", "y"] as const) processAxis(axis);
  }

  const commonConversion = (
    axis: "x" | "y",
    fallback: PositionConversionContext,
  ): PositionConversionContext => {
    if (fallback.parser !== "auto") return fallback;
    const concrete = new Map<string, PositionConversionContext>();
    for (const binding of bindings) {
      const fields =
        axis === "x" ? [binding.xField] : [binding.yField, binding.yminField, binding.ymaxField];
      const conversion = axis === "x" ? binding.xConversion : binding.yConversion;
      if (fields.some((field) => field !== null) && conversion.parser !== "auto") {
        concrete.set(JSON.stringify(conversion), conversion);
      }
    }
    return concrete.size === 1 ? concrete.values().next().value! : fallback;
  };
  const xConversion = commonConversion("x", conversions.x);
  const yConversion = commonConversion("y", conversions.y);
  // Rowless annotations and other author-facing scalar values must use the
  // same parser decision as mapped data when that decision is unambiguous.
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
      if (conversion.forcedDiscrete || (!conversion.requestedTime && conversion.parser === "auto"))
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

  return { decisions, diagnostics, xConversion, yConversion };
}
