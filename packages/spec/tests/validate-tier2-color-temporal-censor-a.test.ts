/**
 * Tier-2 color/fill data-aware scale checks — censored temporal recovery (a).
 * Split from validate-tier2-color.test.ts. Production: validate-data-checks-color.ts.
 */
import { describe, expect, it } from "bun:test";

import { normalize, validate } from "../src/index.js";
import type { DataProfile } from "../src/validate-data.ts";

describe("tier 2 — color scale data-aware validation", () => {
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

  it("does not infer manual domain length from scaled constants alone under DataProfile", () => {
    // Profile fields have values: null. Constants must not stand in for unknown categories.
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
              color: { value: "ref", scale: true },
            },
          },
        ],
        // Runtime domain is categories(g) ∪ {ref}; under a profile we cannot
        // know category count, so range length must not be checked against
        // constants alone.
        scales: { color: { type: "manual", range: ["#f00", "#0f0", "#00f"] } },
      }),
      { profile },
    );
    expect(result.ok).toBe(true);
  });

  it("rejects all-failed censored epoch parses that leave no train extent", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, t: 1e100 },
            { x: 2, y: 2, t: 1e101 },
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
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((error) => error.code === "scale-type-mismatch")).toBe(true);
  });

  it("allows all-failed censored epoch parses when an explicit domain can train", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, t: 1e100 },
            { x: 2, y: 2, t: 1e101 },
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
            domain: [1_700_000_000_000, 1_706_745_600_000],
          },
        },
      }),
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("rejects all-failed censored epoch parses when the explicit domain does not parse", () => {
    // Runtime only maps domain endpoints through semanticOf and throws
    // color-domain-invalid when either endpoint fails the parser. A two-entry
    // domain of unparseable strings must not suppress the scale-type-mismatch.
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, t: 1e100 },
            { x: 2, y: 2, t: 1e101 },
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
            domain: ["bad", "worse"],
          },
        },
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((error) => error.code === "scale-type-mismatch")).toBe(true);
  });

  it("allows all-failed censored temporal colors when a sibling layer trains the channel", () => {
    // Runtime collectColorChannelValues unions every layer's color values before
    // finiteExtent. An all-invalid layer is censored when another layer supplies
    // a valid epoch; validation must not reject field-by-field independently.
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
          },
        },
      }),
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("allows all-failed censored temporal colors when a scaled constant trains the channel", () => {
    const result = validate(
      normalize({
        data: {
          values: [
            { x: 1, y: 1, t: 1e100 },
            { x: 2, y: 2, t: 1e101 },
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
              color: { value: 1_700_000_000_000, scale: true },
            },
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

  it("allows all-failed censored binned temporal colors trained from authored breaks", () => {
    // resolveBinnedColorScale maps breaks and uses first/last as domain when the
    // data extent is empty under parseFailure: "censor".
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
            breaks: ["2024-01-01", "2024-01-15", "2024-01-31"],
          },
        },
      }),
      {},
    );
    expect(result.ok).toBe(true);
  });
});
