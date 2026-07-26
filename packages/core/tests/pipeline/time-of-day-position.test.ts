/**
 * Time-of-day position conversion (#831): portable numbers are seconds since midnight.
 */
import { describe, expect, it } from "bun:test";

import {
  positionConversionContext,
  positionValuesToNumeric,
} from "../../src/pipeline/temporal-position.ts";

describe("time-of-day position conversion (#831)", () => {
  const conversion = positionConversionContext({ type: "time", temporalKind: "time" });

  it("maps seconds since midnight to epoch ms on 1970-01-01Z", () => {
    const { values } = positionValuesToNumeric([0, 3600, 12 * 3600 + 30 * 60], conversion);
    expect(values[0]).toBe(0);
    expect(values[1]).toBe(3_600_000);
    expect(values[2]).toBe((12 * 3600 + 30 * 60) * 1000);
  });

  it("extracts clock portion from Date values (UTC)", () => {
    const d = new Date(Date.UTC(2024, 5, 15, 14, 30, 0));
    const { values } = positionValuesToNumeric([d], conversion);
    expect(values[0]).toBe((14 * 3600 + 30 * 60) * 1000);
  });
});
