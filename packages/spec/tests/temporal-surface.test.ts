/**
 * Characterization: packages/spec/src/temporal.ts remains the stable direct-module
 * surface for runtime symbols and types used by package root + internal callers.
 */
import { describe, expect, it } from "bun:test";

import * as temporal from "../src/temporal.ts";

const RUNTIME_EXPORTS = [
  "TEMPORAL_PARSER_NAMES",
  "TemporalParserSpecSchema",
  "TemporalParseError",
  "canonicalTemporalParserKey",
  "parseTemporal",
  "temporalImplementation",
  "temporalParserConfigurationError",
  "inferTemporalColumn",
  "parseTemporalColumn",
  "ymd",
  "ydm",
  "mdy",
  "myd",
  "dmy",
  "dym",
  "ym",
  "my",
  "yq",
  "ymd_hm",
  "ymd_hms",
  "ydm_hm",
  "ydm_hms",
  "mdy_hm",
  "mdy_hms",
  "myd_hm",
  "myd_hms",
  "dmy_hm",
  "dmy_hms",
  "dym_hm",
  "dym_hms",
  "parseTemporalFormat",
  "fromEpochSeconds",
  "fromEpochMilliseconds",
] as const;

describe("temporal module surface", () => {
  it("exports every runtime symbol previously published from temporal.ts", () => {
    for (const name of RUNTIME_EXPORTS) {
      expect(temporal[name], name).toBeDefined();
    }
  });

  it("does not leak parse/column internal helpers on the facade", () => {
    expect("temporalParseFailure" in temporal).toBe(false);
    expect("DATE_ORDERS" in temporal).toBe(false);
  });
});

// Compile-only: every promised type is importable from the facade path.
import type {
  ParsedTemporalColumn,
  TemporalDecision,
  TemporalDisambiguation,
  TemporalFailure,
  TemporalKind,
  TemporalParseOptions,
  TemporalParseResult,
  TemporalParserName,
  TemporalParserSpec,
  TemporalPrecision,
} from "../src/temporal.ts";

const compileOnlyTemporalFacadeTypes = (): void => {
  const parsers: TemporalParserSpec[] = ["iso", { format: "%Y-%m-%d" }, { epoch: "seconds" }];
  const name: TemporalParserName = "dmy";
  const kind: TemporalKind = "date";
  const precision: TemporalPrecision = "month";
  const disambiguation: TemporalDisambiguation = "reject";
  const options: TemporalParseOptions = { timezone: "UTC", disambiguation };
  const result: TemporalParseResult = { ok: false, reason: "example" };
  const failure: TemporalFailure = { index: 0, value: null, reason: "example" };
  const decision: TemporalDecision = {
    status: "nominal",
    parser: null,
    parserKey: "auto:nominal",
    kind: null,
    precision: null,
    evidence: [],
    nonNullCount: 0,
    validatedCount: 0,
    failedCount: 0,
    candidates: [],
    failures: [failure],
  };
  const column: ParsedTemporalColumn = {
    decision,
    semantic: new Float64Array(0),
    valid: new Uint8Array(0),
  };
  void parsers;
  void name;
  void kind;
  void precision;
  void options;
  void result;
  void column;
};
void compileOnlyTemporalFacadeTypes;
