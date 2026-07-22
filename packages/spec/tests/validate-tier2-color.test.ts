/**
 * Tier-2 color/fill data-aware scale checks (manual domain/range, sequential,
 * temporal color). Production: validate-data-checks-color.ts.
 * Authoring helpers / aliases: color-scale-api.test.ts.
 */
import { describe, expect, it } from "bun:test";

import { normalize, validate } from "../src/index.js";

const point = { geom: "point" as const };

describe("tier 2 — color scale data-aware validation", () => {
  it("validates explicit temporal color parsing against whole-column evidence", () => {
    const temporal = {
      data: {
        values: [
          { x: 1, y: 2, when: "03/04/2024" },
          { x: 2, y: 3, when: "04/05/2024" },
        ],
      },
      aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "when" } },
      layers: [point],
      scales: {
        color: {
          type: "sequential" as const,
          temporalKind: "date" as const,
          parse: "dmy" as const,
        },
      },
    };
    expect(validate(temporal, {}).ok).toBe(true);
    expect(
      validate(
        {
          ...temporal,
          scales: { color: { type: "sequential", temporalKind: "date" } },
        },
        {},
      ).ok,
    ).toBe(false);

    expect(
      validate(
        {
          ...temporal,
          scales: { color: { temporalKind: "date", parse: "dmy" } },
        },
        {},
      ).ok,
    ).toBe(true);
  });

  it("rejects inferred ordinal and temporal fields with incompatible transforms", () => {
    const nominal = validate(
      {
        data: { values: [{ x: 1, y: 2, group: "control" }] },
        aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "group" } },
        layers: [point],
        scales: { color: { transform: "log10" } },
      },
      {},
    );
    expect(nominal.ok).toBe(false);
    if (nominal.ok) throw new Error("expected nominal transform rejection");
    expect(nominal.errors.map(({ code }) => code)).toContain("scale-type-mismatch");

    const temporal = validate(
      {
        data: {
          values: [
            { x: 1, y: 2, when: "2024-01-01" },
            { x: 2, y: 3, when: "2024-01-02" },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "when" } },
        layers: [point],
        scales: { color: { type: "sequential", transform: "log10" } },
      },
      {},
    );
    expect(temporal.ok).toBe(false);
    if (temporal.ok) throw new Error("expected temporal transform rejection");
    expect(temporal.errors.map(({ code }) => code)).toContain("scale-type-mismatch");

    const explicitlyParsed = validate(
      {
        data: {
          values: [
            { x: 1, y: 2, when: "03/04/2024" },
            { x: 2, y: 3, when: "04/05/2024" },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "when" } },
        layers: [point],
        scales: { color: { transform: "log10", parse: "dmy" } },
      },
      {},
    );
    expect(explicitlyParsed.ok).toBe(false);
    if (explicitlyParsed.ok) throw new Error("expected parsed temporal transform rejection");
    expect(explicitlyParsed.errors.map(({ code }) => code)).toContain(
      "scale-type-transform-conflict",
    );
  });

  it("rejects manual range that is shorter than the inferred domain", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, g: "a" },
            { x: 2, y: 2, g: "b" },
          ],
        },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "g" } },
          },
        ],
        scales: { color: { type: "manual", range: ["#f00"] } },
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((error) => error.code === "scale-manual-domain-range")).toBe(true);
  });

  it("rejects temporal color options on quantitative fields without epoch parse", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, c: 100 },
            { x: 2, y: 2, c: 200 },
          ],
        },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "c" } },
          },
        ],
        scales: { color: { type: "sequential", temporalKind: "date", parse: "dmy" } },
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((error) => error.code === "scale-type-mismatch")).toBe(true);
  });

  it("includes scaled color constants in manual domain length checks", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
          ],
        },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { value: "a", scale: true } },
          },
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { value: "b", scale: true } },
          },
        ],
        scales: { color: { type: "manual", range: ["#f00"] } },
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((error) => error.code === "scale-manual-domain-range")).toBe(true);
  });

  it("rejects censored temporal kind mismatches that runtime also rejects", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, t: "2024-01-01 12:00" },
            { x: 2, y: 2, t: "bad" },
            { x: 3, y: 3, t: "2024-02-01 12:00" },
          ],
        },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "t" } },
          },
        ],
        scales: {
          color: {
            type: "sequential",
            temporalKind: "date",
            parse: "ymd_hm",
            parseFailure: "censor",
          },
        },
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((error) => error.code === "scale-type-mismatch")).toBe(true);
  });

  it("allows censored epoch parses that the pipeline still renders", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, t: 1_700_000_000_000 },
            { x: 2, y: 2, t: 1e100 },
            { x: 3, y: 3, t: 1_706_745_600_000 },
          ],
        },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "t" } },
          },
        ],
        scales: {
          color: {
            type: "sequential",
            temporalKind: "datetime",
            parse: { epoch: "milliseconds" },
            parseFailure: "censor",
          },
        },
      }),
      {},
    );
    expect(result.ok).toBe(true);
  });
});
