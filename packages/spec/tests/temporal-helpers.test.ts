/**
 * Temporal authoring helpers and parser identity keys (packages/spec/src/temporal.ts facade).
 * Value parsing: temporal-parse.test.ts. Column inference: temporal-column.test.ts.
 */
import { describe, expect, it } from "bun:test";

import {
  canonicalTemporalParserKey,
  TemporalParseError,
  ymd,
  dmy,
  yq,
  fromEpochSeconds,
} from "../src/temporal.ts";

describe("temporal authoring helpers and parser identity", () => {
  it("returns Dates for scalar and array helpers", () => {
    expect(ymd("2024-02-29")).toBeInstanceOf(Date);
    expect(dmy(["31/12/2024", "01/01/2025"])).toHaveLength(2);
    expect(yq("2024-Q2").toISOString()).toStartWith("2024-04-01T00:00:00.000Z");
    expect(fromEpochSeconds(1_700_000_000).getTime()).toBe(1_700_000_000_000);
    expect(() => ymd("2024-02-30")).toThrow(TemporalParseError);
  });

  it("canonicalizes semantic parser identities", () => {
    expect(canonicalTemporalParserKey("dmy")).toBe("name:dmy");
    expect(canonicalTemporalParserKey({ epoch: "seconds" })).toBe("epoch:seconds");
    expect(canonicalTemporalParserKey({ format: "%Y-%m-%d" })).toBe(
      canonicalTemporalParserKey({ format: "%Y-%m-%d" }),
    );
  });
});
