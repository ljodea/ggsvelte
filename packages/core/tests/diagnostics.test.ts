/**
 * Diagnostics catalog completeness (#628 / M3 audit; #1043).
 *
 * Typed emission registries match catalogs 1:1 (`satisfies Record`).
 * Dual-channel codes must declare a structured emit module — evidence is never
 * recovered from message text for those paths.
 *
 * Emit-site code fields are catalog unions (`PipelineWarningCode`,
 * `PipelineErrorCode`, `AdvisoryCode`, `DiagnosticCode`), so uncatalogued
 * literals fail at compile time. The previous regex source-tree scanner is
 * retired.
 */
import { describe, expect, it } from "bun:test";

import {
  ADVISORY_CATALOG,
  CLI_DIAGNOSTIC_CATALOG,
  PIPELINE_ERROR_CATALOG,
  PIPELINE_WARNING_CATALOG,
} from "../src/diagnostics.ts";
import {
  ADVISORY_EMISSION_REGISTRY,
  CLI_EMISSION_REGISTRY,
  ERROR_EMISSION_REGISTRY,
  WARNING_EMISSION_REGISTRY,
} from "../src/diagnostics-emission-registry.ts";

const advisoryCatalog = new Set(Object.keys(ADVISORY_CATALOG));
const warningCatalog = new Set(Object.keys(PIPELINE_WARNING_CATALOG));

function sortedKeys(record: Record<string, unknown>): string[] {
  return Object.keys(record).toSorted();
}

describe("diagnostics emission registry (primary completeness, #628)", () => {
  it("warning registry keys match PIPELINE_WARNING_CATALOG exactly", () => {
    expect(sortedKeys(WARNING_EMISSION_REGISTRY)).toEqual(sortedKeys(PIPELINE_WARNING_CATALOG));
  });

  it("advisory registry keys match ADVISORY_CATALOG exactly", () => {
    expect(sortedKeys(ADVISORY_EMISSION_REGISTRY)).toEqual(sortedKeys(ADVISORY_CATALOG));
  });

  it("error registry keys match PIPELINE_ERROR_CATALOG exactly", () => {
    expect(sortedKeys(ERROR_EMISSION_REGISTRY)).toEqual(sortedKeys(PIPELINE_ERROR_CATALOG));
  });

  it("cli registry keys match CLI_DIAGNOSTIC_CATALOG exactly", () => {
    expect(sortedKeys(CLI_EMISSION_REGISTRY)).toEqual(sortedKeys(CLI_DIAGNOSTIC_CATALOG));
  });

  it("dual-channel scale-training codes are owned by diagnostics-emit", () => {
    expect(WARNING_EMISSION_REGISTRY["scale-break-outside-domain"].dualChannelModule).toBe(
      "pipeline/diagnostics-emit",
    );
    expect(ADVISORY_EMISSION_REGISTRY["scale-baseline-transformed-origin"].dualChannelModule).toBe(
      "pipeline/diagnostics-emit",
    );
  });

  it("advisory and warning namespaces do not overlap (one code, one channel)", () => {
    const overlap = [...advisoryCatalog].filter((c) => warningCatalog.has(c));
    expect(overlap).toEqual([]);
  });
});
