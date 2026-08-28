/**
 * Tier-2 color/fill data-aware scale checks — censored temporal recovery (b).
 * Split from validate-tier2-color.test.ts. Production: validate-data-checks-color.ts.
 */
import { describe, expect, it } from "bun:test";

import { normalize, validate } from "../src/index.js";
import type { DataProfile } from "../src/validate-data.ts";

describe("tier 2 — color scale data-aware validation", () => {
  it("rejects all-failed censored binned temporal colors when breaks do not parse", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, t: "not-a-date" },
            { x: 2, y: 2, t: "also-bad" },
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
            type: "binned",
            parse: "iso",
            parseFailure: "censor",
            breaks: ["not-a-date", "also-bad"],
          },
        },
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((error) => error.code === "scale-type-mismatch")).toBe(true);
  });

  it("rejects all-failed censored binned temporal colors when breaks are not strictly increasing", () => {
    // Runtime color-binned-breaks requires boundaries strictly increasing in transform space.
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, t: "not-a-date" },
            { x: 2, y: 2, t: "also-bad" },
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
            type: "binned",
            parse: "iso",
            parseFailure: "censor",
            breaks: ["2024-02-01", "2024-01-01"],
          },
        },
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((error) => error.code === "scale-type-mismatch")).toBe(true);
  });

  it("does not treat a temporal sibling as recovery under a mismatched explicit parser", () => {
    // Sibling ISO dates do not train a dmy color scale; runtime reparses the channel
    // with the configured parser and censors them too.
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, bad: "xx", good: "2024-01-15" },
            { x: 2, y: 2, bad: "yy", good: "2024-02-15" },
          ],
        },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "bad" } },
          },
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "good" } },
          },
        ],
        scales: {
          color: {
            type: "sequential",
            temporalKind: "date",
            parse: "dmy",
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

  it("rejects recovery via a scaled constant whose temporal kind conflicts", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, t: "not-a-date" },
            { x: 2, y: 2, t: "also-bad" },
          ],
        },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "t" } },
          },
          {
            geom: "point",
            aes: {
              x: { field: "x" },
              y: { field: "y" },
              color: { value: "2024-01-01T12:00", scale: true },
            },
          },
        ],
        scales: {
          color: {
            type: "sequential",
            temporalKind: "date",
            parse: "iso",
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

  it("rejects a kind-mismatched scaled constant even when a sibling field would recover", () => {
    // Runtime unions sibling field values with scaled constants before the kind check.
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, bad: "xx", good: "2024-01-15" },
            { x: 2, y: 2, bad: "yy", good: "2024-02-15" },
          ],
        },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "bad" } },
          },
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "good" } },
          },
          {
            geom: "point",
            aes: {
              x: { field: "x" },
              y: { field: "y" },
              color: { value: "2024-01-01T12:00", scale: true },
            },
          },
        ],
        scales: {
          color: {
            type: "sequential",
            temporalKind: "date",
            parse: "iso",
            parseFailure: "censor",
          },
        },
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(
      result.errors.some(
        (error) => error.code === "scale-type-mismatch" && error.message.includes("channel value"),
      ),
    ).toBe(true);
  });

  it("rejects kind-mismatched scaled constants when parse is omitted (auto)", () => {
    // Runtime uses parse ?? "auto"; conflict detection must not require explicit parse.
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, when: "2024-01-15" },
            { x: 2, y: 2, when: "2024-02-15" },
          ],
        },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "when" } },
          },
          {
            geom: "point",
            aes: {
              x: { field: "x" },
              y: { field: "y" },
              color: { value: "2024-01-01T12:00", scale: true },
            },
          },
        ],
        scales: {
          color: {
            type: "sequential",
            temporalKind: "date",
          },
        },
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((error) => error.code === "scale-type-mismatch")).toBe(true);
  });

  it("rejects all-failed censored binned temporal colors when a break is null", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, t: "not-a-date" },
            { x: 2, y: 2, t: "also-bad" },
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
            type: "binned",
            parse: "iso",
            parseFailure: "censor",
            breaks: ["2024-01-01", null, "2024-02-01"],
          },
        },
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((error) => error.code === "scale-type-mismatch")).toBe(true);
  });

  it("rejects a kind-mismatched sibling even when a scaled constant would recover", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, bad: "xx", when: "2024-01-01T12:00" },
            { x: 2, y: 2, bad: "yy", when: "2024-02-01T12:00" },
          ],
        },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "bad" } },
          },
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "when" } },
          },
          {
            geom: "point",
            aes: {
              x: { field: "x" },
              y: { field: "y" },
              color: { value: "2024-01-15", scale: true },
            },
          },
        ],
        scales: {
          color: {
            type: "sequential",
            temporalKind: "date",
            parse: "iso",
            parseFailure: "censor",
          },
        },
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(
      result.errors.some(
        (error) => error.code === "scale-type-mismatch" && error.message.includes("channel value"),
      ),
    ).toBe(true);
  });

  it("rejects all-failed censored colors when an authored domain is present but unusable", () => {
    // Runtime throws color-domain-invalid before other recovery sources can train.
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, bad: 1e100, good: 1_700_000_000_000 },
            { x: 2, y: 2, bad: 1e101, good: 1_706_745_600_000 },
          ],
        },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "bad" } },
          },
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "good" } },
          },
        ],
        scales: {
          color: {
            type: "sequential",
            temporalKind: "datetime",
            parse: { epoch: "milliseconds" },
            parseFailure: "censor",
            domain: [1_700_000_000_000],
          },
        },
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((error) => error.code === "scale-type-mismatch")).toBe(true);
  });

  it("still rejects when scaled constants alone exceed the manual range under DataProfile", () => {
    const profile: DataProfile = {
      fields: [
        { name: "g", type: "nominal" },
        { name: "x", type: "quantitative" },
        { name: "y", type: "quantitative" },
      ],
    };
    const result = validate(
      normalize({
        data: { name: "rows" },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "g" } },
          },
          {
            geom: "point",
            aes: {
              x: { field: "x" },
              y: { field: "y" },
              color: { value: "a", scale: true },
            },
          },
          {
            geom: "point",
            aes: {
              x: { field: "x" },
              y: { field: "y" },
              color: { value: "b", scale: true },
            },
          },
        ],
        scales: { color: { type: "manual", range: ["#f00"] } },
      }),
      { profile },
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((error) => error.code === "color-manual-domain-range")).toBe(true);
  });
});
