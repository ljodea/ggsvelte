/** Temporal preflight for mapped field columns (parse, infer, mutate binding conversions). */
import {
  TEMPORAL_PARSER_NAMES,
  type PositionScaleSpec,
  type TemporalParserName,
} from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import type { PositionConversionContext } from "./temporal-position.js";
import { assertTemporalConfiguration, temporalPreflightDocs } from "./temporal-preflight-shared.js";
import type {
  Advisory,
  LayerBinding,
  PipelineWarning,
  ScaleDecision,
  ScaleDiagnostic,
} from "./types.js";
import { PipelineError } from "./types.js";

export function preflightTemporalFields(input: {
  table: ColumnTable;
  bindings: readonly LayerBinding[];
  warnings: PipelineWarning[];
  advisories: Advisory[];
}): { decisions: ScaleDecision[]; diagnostics: ScaleDiagnostic[] } {
  const { table, bindings, warnings, advisories } = input;
  const resolvedByKey = new Map<string, PositionConversionContext>();
  const decisions: ScaleDecision[] = [];
  const diagnostics: ScaleDiagnostic[] = [];
  const docs = temporalPreflightDocs;

  for (const binding of bindings) {
    const processAxis = (axis: "x" | "y"): void => {
      const axisConversion = axis === "x" ? binding.xConversion : binding.yConversion;
      if (axisConversion.forcedDiscrete || axisConversion.forcedNonTemporal) return;
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

  return { decisions, diagnostics };
}
