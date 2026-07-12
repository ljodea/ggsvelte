import { describe, expect, it } from "bun:test";
import { defaultTickFormat, linearTicks, tickStep } from "../src/layout/ticks.ts";

describe("linearTicks", () => {
  it("produces nice 1/2/5 steps inside the domain", () => {
    expect(linearTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(linearTicks(0, 100, 4)).toEqual([0, 20, 40, 60, 80, 100]); // d3 semantics
    expect(linearTicks(-1, 1, 4)).toEqual([-1, -0.5, 0, 0.5, 1]);
  });

  it("handles degenerate and empty domains", () => {
    expect(linearTicks(5, 5, 5)).toEqual([5]);
    expect(linearTicks(NaN, 10, 5)).toEqual([]);
    expect(linearTicks(0, Infinity, 5)).toEqual([]);
  });

  it("tick count shrinks when fewer ticks are requested (thinning lever)", () => {
    const many = linearTicks(0, 1000, 10).length;
    const few = linearTicks(0, 1000, 3).length;
    expect(few).toBeLessThan(many);
    expect(few).toBeGreaterThanOrEqual(2);
  });
});

describe("defaultTickFormat", () => {
  it("groups thousands for huge numbers (wide-label fixture source)", () => {
    const fmt = defaultTickFormat(tickStep(0, 1e15, 5));
    expect(fmt(2e14)).toBe("200,000,000,000,000");
  });

  it("derives decimals from the step (nice steps are 1/2/5 x 10^k)", () => {
    expect(defaultTickFormat(0.2)(0.6)).toBe("0.6");
    expect(defaultTickFormat(0.05)(0.25)).toBe("0.25");
    expect(defaultTickFormat(1)(3)).toBe("3");
  });

  it("falls back to exponential beyond 1e18", () => {
    expect(defaultTickFormat(1e18)(2e18)).toBe("2.00e+18");
  });
});
