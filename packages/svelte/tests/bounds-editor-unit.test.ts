import { describe, expect, it } from "vitest";

import {
  formatBoundsDraft,
  validateBoundsDraft,
  type BoundsEditorInput,
} from "../src/lib/bounds-editor.js";

const input = (overrides: Partial<BoundsEditorInput> = {}): BoundsEditorInput =>
  ({
    axis: "x",
    action: "select",
    scale: "linear",
    bounds: [2, 8],
    ...overrides,
  }) as BoundsEditorInput;

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
        action: "select",
        axis: "x",
        scale: "linear",
        bounds: [3, 7],
        reversed: true,
      },
    });
  });

  it("rejects non-finite, descending, and non-positive log bounds", () => {
    expect(validateBoundsDraft(input(), "nope", "7")).toMatchObject({
      ok: false,
      errors: { lower: expect.any(String) },
    });
    expect(validateBoundsDraft(input(), "8", "2")).toMatchObject({
      ok: false,
      errors: { upper: expect.stringContaining("greater") },
    });
    expect(validateBoundsDraft(input({ scale: "log", bounds: [1, 10] }), "0", "10")).toMatchObject({
      ok: false,
      errors: { lower: expect.stringContaining("greater than zero") },
    });
  });

  it("requires unambiguous ISO-8601 time drafts and emits epoch milliseconds", () => {
    const time = input({
      axis: "y",
      action: "zoom",
      scale: "time",
      bounds: [Date.UTC(2025, 0, 1), Date.UTC(2025, 0, 2)],
    });
    expect(validateBoundsDraft(time, "01/01/2025", "2025-01-02")).toMatchObject({
      ok: false,
      errors: { lower: expect.stringContaining("ISO 8601") },
    });
    expect(validateBoundsDraft(time, "2025-01-01", "2025-01-02")).toEqual({
      ok: true,
      event: {
        source: "precise-bounds",
        action: "zoom",
        axis: "y",
        scale: "time",
        bounds: [Date.UTC(2025, 0, 1), Date.UTC(2025, 0, 2)],
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
    expect(validateBoundsDraft(band, "2", "0")).toMatchObject({
      ok: false,
      errors: { upper: expect.stringContaining("after") },
    });
  });
});
