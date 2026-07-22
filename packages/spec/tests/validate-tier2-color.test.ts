/**
 * Tier-2 color/fill data-aware scale checks (manual domain/range, sequential,
 * temporal color). Production: validate-data-checks-color.ts.
 * Authoring helpers / aliases: color-scale-api.test.ts.
 */
import { describe, expect, it } from "bun:test";

import { normalize, validate } from "../src/index.js";
import type { DataProfile } from "../src/validate-data.ts";

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
        (error) =>
          error.code === "scale-type-mismatch" && error.message.includes("scaled constant"),
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
    expect(result.errors.some((error) => error.code === "scale-manual-domain-range")).toBe(true);
  });
});
