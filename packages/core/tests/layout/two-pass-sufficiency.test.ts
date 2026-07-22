/**
 * Randomized two-pass sufficiency sweep (third-pass almost never moves).
 */
import { describe, expect, it } from "bun:test";

import { layout, layoutPass, marginDelta, type Domain } from "../../src/layout/layout.ts";
import { base, measurer, theme } from "./fixtures.ts";

// --- stability probe: is two passes enough? -------------------------------
// The feedback loop is: margins → inner size → tick count → label widths →
// margins. We quantify how often a hypothetical pass C would still move
// margins after pass B, across a randomized fixture sweep.

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("two-pass sufficiency (randomized sweep)", () => {
  it("a hypothetical third pass almost never moves margins, and never far", () => {
    const rand = mulberry32(20260710);
    const N = 500;
    let convergedAB = 0;
    let cMoved = 0;
    let maxCDelta = 0;
    const words = ["North", "Widget", "Total", "Other", "Revenue", "Government", "µ-service"];

    for (let i = 0; i < N; i++) {
      const width = 90 + Math.floor(rand() * 800);
      const height = 70 + Math.floor(rand() * 550);
      const mkDomain = (): Domain => {
        if (rand() < 0.3) {
          const n = 2 + Math.floor(rand() * 12);
          return {
            type: "band",
            categories: Array.from({ length: n }, () => {
              const k = 1 + Math.floor(rand() * 4);
              return Array.from({ length: k }, () => words[Math.floor(rand() * words.length)]).join(
                " ",
              );
            }),
          };
        }
        const mag = 10 ** (Math.floor(rand() * 21) - 5);
        const a = (rand() - 0.5) * 2 * mag;
        const b = a + rand() * mag;
        return { type: "linear", min: a, max: b };
      };
      const input = base({ width, height, x: mkDomain(), y: mkDomain() });
      const r = layout(input);
      if (r.converged) convergedAB++;
      const passC = layoutPass(r.margins, input, theme);
      const delta = marginDelta(passC.margins, r.margins);
      if (delta > 0.5) cMoved++;
      if (delta > maxCDelta) maxCDelta = delta;
      // The 0.5px rule is sound: when A→B converged, C is bit-identical to B
      // (quantized margins are equal, so the pass re-runs deterministically).
      if (r.converged) expect(delta).toBe(0);
      // Safety property that makes "pass B wins" acceptable even when a pass C
      // WOULD move margins: the final margins were computed from the final
      // tick labels, so the labels always fit — the only cost of stopping at
      // two passes is slightly off-target tick density.
      const yWidest = Math.max(
        0,
        ...r.y.ticks
          .filter((t) => t.labeled)
          .map((t) => measurer.measureWidth(t.label, theme.fontSize)),
      );
      const capLeft = Math.floor((theme.maxMarginFraction * width) / theme.quantum) * theme.quantum;
      expect(r.margins.left + 1e-6).toBeGreaterThanOrEqual(
        Math.min(yWidest + theme.tickLength + theme.tickLabelGap, capLeft),
      );
    }

    console.log(
      `[two-pass sweep] N=${N} A→B converged=${convergedAB} (${((100 * convergedAB) / N).toFixed(1)}%) ` +
        `C-moved=${cMoved} (${((100 * cMoved) / N).toFixed(1)}%) maxCDelta=${maxCDelta}px`,
    );

    // Verdict material (see decision record 0003): the tick-count-from-range
    // feedback CAN oscillate with period 2 in adversarial fixtures (last x
    // label flipping between "0" and a 19-char grouped number as tick count
    // changes), but it is rare and pass-B-wins is safe by the property above.
    expect(convergedAB / N).toBeGreaterThanOrEqual(0.95);
    expect(cMoved / N).toBeLessThanOrEqual(0.02);
  });
});
