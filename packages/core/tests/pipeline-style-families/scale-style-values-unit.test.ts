/**
 * Unit tests for resolveNumericStyleValueView (#style temporal + lean).
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import { installTemporal } from "../../src/install-temporal.ts";
import { resolveNumericStyleValueView } from "../../src/pipeline/scale-style-values.ts";
import { PipelineError } from "../../src/pipeline/types.ts";
import type { PipelineWarning } from "../../src/pipeline/types.ts";
import { getTemporalRuntime, resetTemporalRuntimeForTests } from "../../src/temporal-runtime.ts";

describe("resolveNumericStyleValueView (non-temporal)", () => {
  it("fast-paths dense number columns", () => {
    const warnings: PipelineWarning[] = [];
    const view = resolveNumericStyleValueView({
      aesthetic: "size",
      values: [1, 2, 3],
      config: { type: "sequential" },
      warnings,
    });
    expect([...view.semantic]).toEqual([1, 2, 3]);
    expect(view.temporalKind).toBeNull();
    expect(view.semanticOf(2)).toBe(2);
    expect(view.semanticOf("nope")).toBeUndefined();
    expect(warnings).toEqual([]);
  });

  it("falls back to cellToNumber from the first non-number", () => {
    const date = new Date("2024-01-01T00:00:00.000Z");
    const view = resolveNumericStyleValueView({
      aesthetic: "alpha",
      values: [1, "2.5", date, null],
      config: undefined,
      warnings: [],
    });
    expect(view.semantic[0]).toBe(1);
    expect(view.semantic[1]).toBe(2.5);
    expect(view.semantic[2]).toBe(date.getTime());
    expect(Number.isNaN(view.semantic[3]!)).toBe(true);
  });
});

describe("resolveNumericStyleValueView (temporal with runtime)", () => {
  it("parses date strings into a temporal semantic view", () => {
    const warnings: PipelineWarning[] = [];
    const view = resolveNumericStyleValueView({
      aesthetic: "size",
      values: ["2024-01-01", "2024-01-03"],
      config: { type: "sequential", temporalKind: "date", parse: "ymd" },
      warnings,
    });
    expect(view.temporalKind).toBe("date");
    expect(view.semantic.length).toBe(2);
    expect(view.semantic[0]!).toBeLessThan(view.semantic[1]!);
    expect(view.semanticOf("2024-01-01")).toBe(view.semantic[0]);
    expect(warnings).toEqual([]);
  });

  it("throws style-temporal-parse when values fail and censor is off", () => {
    expect(() =>
      resolveNumericStyleValueView({
        aesthetic: "linewidth",
        values: ["2024-01-01", "not-a-date"],
        config: { temporalKind: "date", parse: "ymd" },
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({ code: "style-temporal-parse" } satisfies Partial<PipelineError>),
    );
  });

  it("censors failed temporal values when parseFailure is censor", () => {
    const warnings: PipelineWarning[] = [];
    const view = resolveNumericStyleValueView({
      aesthetic: "size",
      values: ["2024-01-01", "not-a-date"],
      config: { temporalKind: "date", parse: "ymd", parseFailure: "censor" },
      warnings,
    });
    expect(warnings.some((w) => w.code === "style-temporal-censored")).toBe(true);
    expect(Number.isFinite(view.semantic[0]!)).toBe(true);
  });

  it("throws style-temporal-kind when parsed precision mismatches temporalKind", () => {
    expect(() =>
      resolveNumericStyleValueView({
        aesthetic: "size",
        values: ["2024-01-01T10:00:00", "2024-01-02T10:00:00"],
        config: { temporalKind: "date", parse: "ymd_hms" },
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({ code: "style-temporal-kind" } satisfies Partial<PipelineError>),
    );
  });

  it("seeds temporal parse from an authored domain when samples are empty", () => {
    const warnings: PipelineWarning[] = [];
    const view = resolveNumericStyleValueView({
      aesthetic: "size",
      values: [],
      config: {
        type: "sequential",
        temporalKind: "date",
        parse: "ymd",
        domain: ["2024-01-01", "2024-01-31"],
      },
      warnings,
    });
    expect(view.temporalKind).toBe("date");
    expect(view.semantic.length).toBe(2);
    expect(warnings).toEqual([]);
  });

  it("seeds binned temporal breaks when samples are empty", () => {
    const view = resolveNumericStyleValueView({
      aesthetic: "size",
      values: [],
      config: {
        type: "binned",
        temporalKind: "date",
        parse: "ymd",
        breaks: ["2024-01-01", "2024-06-01", "2024-12-31"],
      },
      warnings: [],
    });
    expect(view.temporalKind).toBe("date");
    expect(view.semantic.length).toBe(3);
  });
});

describe("resolveNumericStyleValueView (lean: no temporal runtime)", () => {
  beforeAll(() => {
    resetTemporalRuntimeForTests();
    expect(getTemporalRuntime()).toBeNull();
  });

  afterAll(() => {
    installTemporal();
    expect(getTemporalRuntime()).not.toBeNull();
  });

  it("treats temporal requests as non-temporal parse failures without the polyfill", () => {
    // Lean runtimeParseColumn always reports nominal; explicit temporal
    // request must still fail loudly instead of inventing epochs.
    expect(() =>
      resolveNumericStyleValueView({
        aesthetic: "size",
        values: ["2024-01-01", "2024-01-02"],
        config: { temporalKind: "date", parse: "ymd" },
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({ code: "style-temporal-parse" } satisfies Partial<PipelineError>),
    );
  });

  it("censors under lean when parseFailure is censor", () => {
    const warnings: PipelineWarning[] = [];
    resolveNumericStyleValueView({
      aesthetic: "alpha",
      values: [1, 2, 3],
      config: { timezone: "UTC", parseFailure: "censor" },
      warnings,
    });
    expect(warnings.some((w) => w.code === "style-temporal-censored")).toBe(true);
  });
});
