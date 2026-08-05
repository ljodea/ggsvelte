/**
 * Unit tests for resolveFiniteStyleScale (shape/linetype identity + binned edges).
 */
import { describe, expect, it } from "bun:test";

import { resolveFiniteStyleScale } from "../../src/pipeline/scale-style-finite.ts";
import { PipelineError } from "../../src/pipeline/types.ts";
import type { PipelineWarning } from "../../src/pipeline/types.ts";

const base = {
  aesthetic: "shape" as const,
  catalog: [] as const,
  anyDiscrete: true,
  anyIndexable: false,
  prevState: null,
  title: "shape",
};

describe("resolveFiniteStyleScale identity", () => {
  it("maps known shape names and warns on unknowns", () => {
    const warnings: PipelineWarning[] = [];
    const resolution = resolveFiniteStyleScale({
      ...base,
      values: ["circle", "square", "not-a-shape", null],
      config: { type: "identity" },
      warnings,
    });
    expect(resolution.resolved.kind).toBe("identity");
    expect(resolution.resolved.scale.valueOf("circle")).toBe("circle");
    expect(resolution.resolved.scale.valueOf("not-a-shape")).toBe("circle"); // unknown → fallback
    expect(resolution.resolved.scale.valueOf(null)).toBe("circle"); // na → fallback
    expect(warnings.some((w) => w.code === "style-unknown-values")).toBe(true);
  });

  it("builds a force-guide legend domain from observed valid symbols", () => {
    const resolution = resolveFiniteStyleScale({
      ...base,
      values: ["circle", "square", "circle", "triangle"],
      config: {
        type: "identity",
        guide: { type: "legend", force: true },
      },
      warnings: [],
    });
    expect(resolution.guidePlan?.type).toBe("discrete");
    if (resolution.guidePlan?.type !== "discrete") throw new Error("expected discrete guide");
    expect(resolution.guidePlan.domain).toEqual(["circle", "square", "triangle"]);
    expect(resolution.legendInput?.kind).toBe("discrete");
  });
});

describe("resolveFiniteStyleScale binned", () => {
  it("bins numeric values into the configured range", () => {
    const resolution = resolveFiniteStyleScale({
      ...base,
      values: [0, 5, 10],
      config: {
        type: "binned",
        breaks: [0, 5, 10],
        range: ["circle", "square"],
      },
      warnings: [],
    });
    expect(resolution.resolved.kind).toBe("binned");
    expect(resolution.resolved.scale.valueOf(1)).toBe("circle");
    expect(resolution.resolved.scale.valueOf(7)).toBe("square");
    expect(resolution.resolved.scale.valueOf(null)).toBe("circle");
    expect(resolution.resolved.scale.valueOf(99)).toBe("circle"); // OOB → unknown/fallback
  });

  it("throws style-domain-empty when no finite samples or boundaries exist", () => {
    expect(() =>
      resolveFiniteStyleScale({
        ...base,
        values: [null, null],
        config: { type: "binned" },
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({ code: "style-domain-empty" } satisfies Partial<PipelineError>),
    );
  });

  it("throws style-domain-invalid for a non-pair domain", () => {
    expect(() =>
      resolveFiniteStyleScale({
        ...base,
        values: [1, 2, 3],
        config: { type: "binned", domain: [0] as unknown as [number, number] },
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({ code: "style-domain-invalid" } satisfies Partial<PipelineError>),
    );
  });

  it("throws style-binned-breaks for non-increasing boundaries", () => {
    expect(() =>
      resolveFiniteStyleScale({
        ...base,
        values: [1, 2],
        config: { type: "binned", breaks: [0, 5, 5], range: ["circle", "square"] },
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({ code: "style-binned-breaks" } satisfies Partial<PipelineError>),
    );
  });

  it("throws style-palette-exhausted when breaks need more symbols than range", () => {
    expect(() =>
      resolveFiniteStyleScale({
        ...base,
        values: [0, 1, 2, 3],
        config: {
          type: "binned",
          breaks: [0, 1, 2, 3],
          range: ["circle"],
        },
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({ code: "style-palette-exhausted" } satisfies Partial<PipelineError>),
    );
  });

  it("throws when continuous values have no explicit finite scale type", () => {
    expect(() =>
      resolveFiniteStyleScale({
        ...base,
        values: [1, 2, 3],
        anyDiscrete: false,
        config: undefined,
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({
        code: "unsupported-aesthetic-scale",
      } satisfies Partial<PipelineError>),
    );
  });

  it("rejects non-numeric values under type binned", () => {
    expect(() =>
      resolveFiniteStyleScale({
        ...base,
        values: ["2024-01-01", "2024-06-01"],
        config: { type: "binned", breaks: [0, 1, 2] },
        warnings: [],
      }),
    ).toThrow(
      expect.objectContaining({
        code: "unsupported-aesthetic-scale",
      } satisfies Partial<PipelineError>),
    );
  });

  it("trains from authored breaks when samples are empty", () => {
    const resolution = resolveFiniteStyleScale({
      ...base,
      values: [],
      config: {
        type: "binned",
        breaks: [0, 5, 10],
        range: ["circle", "square"],
      },
      warnings: [],
    });
    expect(resolution.resolved.kind).toBe("binned");
    expect(resolution.guidePlan?.type).toBe("discrete");
  });

  it("warns on invalid label format strings", () => {
    const warnings: PipelineWarning[] = [];
    resolveFiniteStyleScale({
      ...base,
      values: [0, 10],
      config: {
        type: "binned",
        breaks: [0, 5, 10],
        range: ["circle", "square"],
        labels: "not-a-real-format-%%%",
      },
      warnings,
    });
    expect(warnings.some((w) => w.code === "invalid-label-format")).toBe(true);
  });
});
