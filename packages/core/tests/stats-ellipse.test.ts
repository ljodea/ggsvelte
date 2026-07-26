/**
 * Pure stat_ellipse math (#812).
 */
import { describe, expect, it } from "bun:test";

import { ellipsePerimeter, qchisq2, sampleCov2, statEllipse } from "../src/stats/ellipse.ts";

describe("qchisq2", () => {
  it("matches known 2-df quantiles", () => {
    // R: qchisq(0.95, 2) ≈ 5.991464
    expect(qchisq2(0.95)).toBeCloseTo(5.9914645471, 8);
    expect(qchisq2(0.5)).toBeCloseTo(1.3862943611, 8);
  });
});

describe("sampleCov2 / ellipsePerimeter", () => {
  it("isotropic cloud yields near-circular ellipse", () => {
    // Unit circle samples → cov ≈ I
    const n = 8;
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const t = (2 * Math.PI * i) / n;
      x[i] = Math.cos(t);
      y[i] = Math.sin(t);
    }
    const cov = sampleCov2(
      x,
      y,
      Array.from({ length: n }, (_, i) => i),
    );
    expect(cov).not.toBeNull();
    expect(cov!.sxx).toBeCloseTo(cov!.syy, 5);
    const ring = ellipsePerimeter(cov!, 0.95, 36);
    // Closed: first == last
    expect(ring.x[0]).toBeCloseTo(ring.x.at(-1)!, 12);
    expect(ring.y[0]).toBeCloseTo(ring.y.at(-1)!, 12);
    expect(ring.x.length).toBe(37); // 36 + close
  });

  it("drops groups with fewer than 2 finite points", () => {
    const result = statEllipse({
      x: Float64Array.of(0, 1, 2),
      y: Float64Array.of(0, 1, 2),
      groups: [0, 0, 1], // group 1 has only one point
      carried: {},
      params: { level: 0.95, segments: 8 },
    });
    expect(result.droppedGroups).toBe(1);
    expect(result.x.length).toBe(9); // 8 + close for group 0 only
  });
});
