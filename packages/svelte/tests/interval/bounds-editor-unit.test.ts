import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";

import {
  formatBoundsDraft,
  validateBoundsDraft,
  type BoundsEditorInput,
} from "../../src/lib/interval/bounds-editor.js";

const input = (overrides: Partial<BoundsEditorInput> = {}): BoundsEditorInput =>
  fromPartial<BoundsEditorInput>({
    axis: "x",
    action: "select",
    scale: "linear",
    transform: "identity",
    bounds: [2, 8],
    ...overrides,
  });

describe("precise bounds drafts", () => {
  it("formats continuous and time values without local-time conversion", () => {
    expect(formatBoundsDraft(input())).toEqual({ lower: "2", upper: "8" });
    expect(
      formatBoundsDraft(
        input({
          scale: "time",
          bounds: [Date.UTC(2025, 0, 2), Date.UTC(2025, 0, 3, 12, 30)],
        }),
      ),
    ).toEqual({ lower: "2025-01-02T00:00:00.000Z", upper: "2025-01-03T12:30:00.000Z" });
  });

  it("keeps reversed linear domains semantic and ascending", () => {
    const result = validateBoundsDraft(input({ reversed: true }), "3", "7");
    expect(result).toEqual({
      ok: true,
      event: {
        source: "precise-bounds",
        inputSource: "keyboard",
        action: "select",
        axis: "x",
        scale: "linear",
        transform: "identity",
        bounds: [3, 7],
        reversed: true,
      },
    });
  });

  it("rejects non-finite, descending, and non-positive log10 bounds", () => {
    const nonFinite = validateBoundsDraft(input(), "nope", "7");
    expect(nonFinite.ok).toBe(false);
    if (nonFinite.ok) throw new Error("expected invalid bounds");
    expect(typeof nonFinite.errors.lower).toBe("string");

    const descending = validateBoundsDraft(input(), "8", "2");
    expect(descending.ok).toBe(false);
    if (descending.ok) throw new Error("expected invalid bounds");
    expect(descending.errors.upper).toContain("greater");

    const nonPositiveLog = validateBoundsDraft(
      input({ scale: "linear", transform: "log10", bounds: [1, 10] }),
      "0",
      "10",
    );
    expect(nonPositiveLog.ok).toBe(false);
    if (nonPositiveLog.ok) throw new Error("expected invalid bounds");
    expect(nonPositiveLog.errors.lower).toContain("greater than zero");
  });

  it("rejects negative sqrt bounds but accepts zero", () => {
    const negativeSqrt = validateBoundsDraft(
      input({ scale: "linear", transform: "sqrt", bounds: [0, 10] }),
      "-1",
      "10",
    );
    expect(negativeSqrt.ok).toBe(false);
    if (negativeSqrt.ok) throw new Error("expected invalid bounds");
    expect(negativeSqrt.errors.lower).toContain("zero or greater");

    const zeroLower = validateBoundsDraft(
      input({ scale: "linear", transform: "sqrt", bounds: [0, 10] }),
      "0",
      "10",
    );
    expect(zeroLower).toEqual({
      ok: true,
      event: {
        source: "precise-bounds",
        inputSource: "keyboard",
        action: "select",
        axis: "x",
        scale: "linear",
        transform: "sqrt",
        bounds: [0, 10],
        reversed: false,
      },
    });
  });

  it("requires unambiguous ISO-8601 time drafts and emits epoch milliseconds", () => {
    const time = input({
      axis: "y",
      action: "zoom",
      scale: "time",
      bounds: [Date.UTC(2025, 0, 1), Date.UTC(2025, 0, 2)],
    });
    const ambiguous = validateBoundsDraft(time, "01/01/2025", "2025-01-02");
    expect(ambiguous.ok).toBe(false);
    if (ambiguous.ok) throw new Error("expected invalid bounds");
    expect(ambiguous.errors.lower).toContain("ISO 8601");
    expect(validateBoundsDraft(time, "2025-01-01", "2025-01-02")).toEqual({
      ok: true,
      event: {
        source: "precise-bounds",
        inputSource: "keyboard",
        action: "zoom",
        axis: "y",
        scale: "time",
        bounds: [Date.UTC(2025, 0, 1), Date.UTC(2025, 0, 2)],
        reversed: false,
      },
    });
  });

  it("rejects normalized invalid ISO date-times instead of committing shifted dates", () => {
    const time = input({
      axis: "y",
      action: "zoom",
      scale: "time",
      bounds: [Date.UTC(2025, 0, 1), Date.UTC(2025, 5, 1)],
    });
    // Date.parse silently normalizes overflow days (2025-02-30 → March 2);
    // committing that would apply a different date than the user entered.
    const overflow = validateBoundsDraft(time, "2025-02-30T00:00Z", "2025-04-31T12:00+00:00");
    expect(overflow.ok).toBe(false);
    if (overflow.ok) throw new Error("expected invalid bounds");
    expect(overflow.errors.lower).toContain("valid ISO 8601");
    expect(overflow.errors.upper).toContain("valid ISO 8601");

    const valid = validateBoundsDraft(time, "2024-02-29T00:00Z", "2025-04-30T12:00+00:00");
    expect(valid.ok).toBe(true);
  });

  it("accepts sub-millisecond fractions and colonless offsets from database timestamps", () => {
    const time = input({
      axis: "y",
      action: "zoom",
      scale: "time",
      bounds: [Date.UTC(2025, 0, 1), Date.UTC(2025, 5, 1)],
    });
    // Both forms are valid ISO 8601 and commonly emitted by databases and
    // APIs; Date.parse accepts them after normalization.
    const pasted = validateBoundsDraft(
      time,
      "2025-01-01T00:00:00.123456Z",
      "2025-03-01T00:00:00+0000",
    );
    expect(pasted).toEqual({
      ok: true,
      event: {
        source: "precise-bounds",
        inputSource: "keyboard",
        action: "zoom",
        axis: "y",
        scale: "time",
        bounds: [Date.UTC(2025, 0, 1, 0, 0, 0, 123), Date.UTC(2025, 2, 1)],
        reversed: false,
      },
    });
  });

  it("returns original typed band values and validates inclusive domain order", () => {
    const band = input({
      scale: "band",
      bounds: [1, true],
      categories: [
        { value: 1, label: "one" },
        { value: "1", label: "string one" },
        { value: true, label: "yes" },
      ],
    });
    expect(validateBoundsDraft(band, "0", "2")).toMatchObject({
      ok: true,
      event: { scale: "band", bounds: [1, true] },
    });
    const descending = validateBoundsDraft(band, "2", "0");
    expect(descending.ok).toBe(false);
    if (descending.ok) throw new Error("expected invalid bounds");
    expect(descending.errors.upper).toContain("after");
  });
});
