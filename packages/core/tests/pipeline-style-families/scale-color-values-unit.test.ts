/**
 * Unit tests for resolveColorValueView (temporal request + transform conflict).
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import { installTemporal } from "../../src/install-temporal.ts";
import { resolveColorValueView } from "../../src/pipeline/scale-color-values.ts";
import { PipelineError } from "../../src/pipeline/types.ts";
import type { PipelineWarning } from "../../src/pipeline/types.ts";
import { getTemporalRuntime, resetTemporalRuntimeForTests } from "../../src/temporal-runtime.ts";

describe("resolveColorValueView (non-temporal)", () => {
  it("coerces quantitative columns without requesting temporal", () => {
    const view = resolveColorValueView({
      name: "color",
      values: [1, 2, "3"],
      config: { type: "sequential" },
      warnings: [],
    });
    expect([...view.semantic]).toEqual([1, 2, 3]);
    expect(view.temporalKind).toBeNull();
    expect(view.parser).toBeNull();
    expect(view.semanticOf(2)).toBe(2);
  });
});

describe("resolveColorValueView (temporal with runtime)", () => {
  it("parses temporal color values and exposes semanticOf", () => {
    const warnings: PipelineWarning[] = [];
    const view = resolveColorValueView({
      name: "fill",
      values: ["2024-01-01", "2024-02-01"],
      config: { type: "sequential", temporalKind: "date", parse: "ymd" },
      warnings,
    });
    expect(view.temporalKind).toBe("date");
    expect(view.parser).toBe("ymd");
    expect(view.semanticOf("2024-01-01")).toBe(view.semantic[0]);
    expect(warnings).toEqual([]);
  });

  it("rejects temporal color with a non-identity transform", () => {
    expect(() =>
      resolveColorValueView({
        name: "color",
        values: ["2024-01-01"],
        config: { temporalKind: "date", parse: "ymd", transform: "log10" },
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({
        code: "scale-type-transform-conflict",
      } satisfies Partial<PipelineError>),
    );
  });

  it("throws color-temporal-parse when the column does not parse", () => {
    expect(() =>
      resolveColorValueView({
        name: "color",
        values: ["2024-01-01", "nope"],
        config: { temporalKind: "date", parse: "ymd" },
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({ code: "color-temporal-parse" } satisfies Partial<PipelineError>),
    );
  });

  it("censors color temporal parse failures when configured", () => {
    const warnings: PipelineWarning[] = [];
    resolveColorValueView({
      name: "fill",
      values: ["2024-01-01", "nope"],
      config: { temporalKind: "date", parse: "ymd", parseFailure: "censor" },
      warnings,
    });
    expect(warnings.some((w) => w.code === "color-temporal-censored")).toBe(true);
  });

  it("throws color-temporal-kind on precision mismatch", () => {
    expect(() =>
      resolveColorValueView({
        name: "color",
        values: ["2024-01-01T12:00:00", "2024-01-02T12:00:00"],
        config: { temporalKind: "date", parse: "ymd_hms" },
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({ code: "color-temporal-kind" } satisfies Partial<PipelineError>),
    );
  });
});

describe("resolveColorValueView (lean: no temporal runtime)", () => {
  beforeAll(() => {
    resetTemporalRuntimeForTests();
    expect(getTemporalRuntime()).toBeNull();
  });

  afterAll(() => {
    installTemporal();
    expect(getTemporalRuntime()).not.toBeNull();
  });

  it("fails temporal color requests loudly without the polyfill", () => {
    expect(() =>
      resolveColorValueView({
        name: "color",
        values: ["2024-01-01"],
        config: { temporalKind: "date", parse: "ymd" },
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({ code: "color-temporal-parse" } satisfies Partial<PipelineError>),
    );
  });
});
