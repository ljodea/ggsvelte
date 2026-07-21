/**
 * PR 3 — position-scale TypeScript/runtime parity proofs (compile-only).
 *
 * Run via `tsc -p packages/spec/type-tests/tsconfig.json` (root
 * `check:type-contracts`). Proves the new `PositionScaleSpec` fields/enums
 * exist at the type level, that transform-family helpers narrow their options
 * (rejecting temporal-only and forced keys), and that `limits` sugar is
 * accepted. A `@ts-expect-error` that stops erroring — or a missing field —
 * fails compilation.
 */
import {
  scaleXBinned,
  scaleXContinuous,
  scaleXLog10,
  scaleXReverse,
  scaleXSqrt,
} from "../src/scale-helpers.js";
import type { ContinuousPositionScaleOptions } from "../src/scale-helpers.js";
import type { PositionScaleSpec } from "../src/schema.js";

type Assert<Condition extends true> = Condition;
type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;

// --- new fields exist on the closed PositionScaleSpec object -----------------
export type _HasTransform = Assert<HasKey<PositionScaleSpec, "transform">>;
export type _HasExpand = Assert<HasKey<PositionScaleSpec, "expand">>;
export type _HasOob = Assert<HasKey<PositionScaleSpec, "oob">>;
export type _HasNaValue = Assert<HasKey<PositionScaleSpec, "naValue">>;
export type _HasMinorBreaks = Assert<HasKey<PositionScaleSpec, "minorBreaks">>;

// --- transform is exactly identity | log10 | sqrt ----------------------------
type Transform = NonNullable<PositionScaleSpec["transform"]>;
export type _TransformSound = Assert<
  [Transform] extends ["identity" | "log10" | "sqrt"] ? true : false
>;
export type _TransformComplete = Assert<
  ["identity" | "log10" | "sqrt"] extends [Transform] ? true : false
>;

// --- oob is exactly censor | squish ------------------------------------------
type Oob = NonNullable<PositionScaleSpec["oob"]>;
export type _OobExact = Assert<
  [Oob] extends ["censor" | "squish"] ? ("censor" | "squish" extends Oob ? true : false) : false
>;

// --- binned joins the position type union ------------------------------------
type ScaleType = NonNullable<PositionScaleSpec["type"]>;
export type _BinnedInType = Assert<"binned" extends ScaleType ? true : false>;

// --- naValue admits a finite number or null ----------------------------------
export type _NaValueNumberOk = Assert<
  number extends NonNullable<PositionScaleSpec["naValue"]> ? true : false
>;

// --- continuous options carry limits + transform but not temporal keys -------
export type _OptionsHaveLimits = Assert<HasKey<ContinuousPositionScaleOptions, "limits">>;
export type _OptionsHaveTransform = Assert<HasKey<ContinuousPositionScaleOptions, "transform">>;
export type _OptionsRejectTemporal = Assert<
  HasKey<ContinuousPositionScaleOptions, "timezone"> extends false ? true : false
>;

// --- helpers accept `limits` sugar and continuous options --------------------
scaleXContinuous({ limits: [1, 100], transform: "log10", expand: { mult: 0.05 } });
scaleXLog10({ limits: [1, 1000], oob: "squish", naValue: 1 });
scaleXSqrt({ nice: false });
scaleXBinned({ limits: [0, 100], breaks: [0, 50, 100], transform: "sqrt" });
scaleXReverse({ minorBreaks: [1, 2, 3] });

// --- continuous helpers reject temporal-only options -------------------------
// @ts-expect-error dateBreaks is temporal-only
scaleXContinuous({ dateBreaks: "1 day" });
// @ts-expect-error timezone is temporal-only
scaleXLog10({ timezone: "UTC" });

// --- the log10 helper forces its transform (transform is not an option) ------
// @ts-expect-error scaleXLog10 forces transform:"log10"
scaleXLog10({ transform: "identity" });
// @ts-expect-error scaleXSqrt forces transform:"sqrt"
scaleXSqrt({ transform: "log10" });

// --- an unknown transform literal is rejected on the generic helper ----------
// @ts-expect-error unknown transform literal
scaleXContinuous({ transform: "ln" });
