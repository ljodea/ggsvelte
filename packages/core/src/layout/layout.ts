/**
 * Bounded two-pass layout: derive ticks from provisional ranges, measure, then
 * repeat once with measured margins. Pass B always wins.
 */
import { runLayoutPass } from "./layout-pass.js";
import {
  DEFAULT_LAYOUT_THEME,
  type LayoutInput,
  type LayoutResult,
  type LayoutTheme,
  type Margins,
  type PassResult,
} from "./layout-types.js";

export {
  DEFAULT_LAYOUT_THEME,
  type AxisResult,
  type BandLayoutDomainContext,
  type Domain,
  type LayoutAxisPresentation,
  type LayoutInput,
  type LayoutResult,
  type LayoutTheme,
  type Margins,
  type PassResult,
  type TemporalLayoutDomainContext,
  type Tick,
  type TickFormatter,
} from "./layout-types.js";

/** One measurement pass, exported so tests can probe a hypothetical third pass. */
export function layoutPass(margins: Margins, input: LayoutInput, theme: LayoutTheme): PassResult {
  return runLayoutPass(margins, input, theme);
}

/** Max per-side difference between two margin sets, in px. */
export function marginDelta(a: Margins, b: Margins): number {
  return Math.max(
    Math.abs(a.top - b.top),
    Math.abs(a.right - b.right),
    Math.abs(a.bottom - b.bottom),
    Math.abs(a.left - b.left),
  );
}

/** The bounded two-pass layout. */
export function layout(input: LayoutInput): LayoutResult {
  const theme: LayoutTheme = { ...DEFAULT_LAYOUT_THEME, ...input.theme };
  const passA = layoutPass(theme.marginPriors, input, theme);
  const passB = layoutPass(
    passA.margins,
    {
      ...input,
      previousGuidePlans: {
        ...(passA.x.guidePlan !== undefined && { x: passA.x.guidePlan }),
        ...(passA.y.guidePlan !== undefined && { y: passA.y.guidePlan }),
      },
    },
    theme,
  );
  const converged = marginDelta(passA.margins, passB.margins) <= 0.5;
  return {
    ...passB,
    innerWidth: Math.max(1, input.width - passB.margins.left - passB.margins.right),
    innerHeight: Math.max(1, input.height - passB.margins.top - passB.margins.bottom),
    converged,
    passes: 2,
    passAMargins: passA.margins,
  };
}
