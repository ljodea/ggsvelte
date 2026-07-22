/**
 * Fluent builder scale sugar methods (thin wrappers over scale-helpers).
 * Core builder: builder.ts. Geom options: builder-options.ts.
 */
import {
  scaleColorBinned,
  scaleColorContinuous,
  scaleColorDate,
  scaleColorDatetime,
  scaleColorDiscrete,
  scaleColorIdentity,
  scaleColorLog10,
  scaleColorManual,
  scaleColorSqrt,
  scaleFillBinned,
  scaleFillContinuous,
  scaleFillDate,
  scaleFillDatetime,
  scaleFillDiscrete,
  scaleFillIdentity,
  scaleFillLog10,
  scaleFillManual,
  scaleFillSqrt,
  scaleXBinned,
  scaleXContinuous,
  scaleXDate,
  scaleXDatetime,
  scaleXDiscrete,
  scaleXLog10,
  scaleXReverse,
  scaleXSqrt,
  scaleYBinned,
  scaleYContinuous,
  scaleYDate,
  scaleYDatetime,
  scaleYDiscrete,
  scaleYLog10,
  scaleYReverse,
  scaleYSqrt,
  type BinnedColorScaleOptions,
  type ContinuousPositionScaleOptions,
  type DiscreteColorScaleOptions,
  type DiscretePositionScaleOptions,
  type IdentityColorScaleOptions,
  type ManualColorScaleOptions,
  type SequentialColorScaleOptions,
  type TemporalColorScaleOptions,
  type TemporalScaleOptions,
  type TransformedColorScaleOptions,
  type TransformedPositionScaleOptions,
} from "./scale-helpers.js";
import type { Scales } from "./schema.js";

/** Host must expose scales() so sugar methods can merge scale configs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixin host constructor
type ScaleHostConstructor = new (...args: any[]) => {
  scales(scales: Scales): any;
};

/**
 * Mixin that adds scaleX/Y/Color/Fill sugar methods.
 * Returns the same fluent type as the host `scales()` method.
 */
export function WithBuilderScales<TBase extends ScaleHostConstructor>(Base: TBase) {
  return class extends Base {
    /** Configure the x scale as calendar dates. */
    scaleXDate(options: TemporalScaleOptions = {}) {
      return this.scales(scaleXDate(options));
    }

    /** Configure the x scale as date-time instants. */
    scaleXDatetime(options: TemporalScaleOptions = {}) {
      return this.scales(scaleXDatetime(options));
    }

    /** Configure the y scale as calendar dates. */
    scaleYDate(options: TemporalScaleOptions = {}) {
      return this.scales(scaleYDate(options));
    }

    /** Configure the y scale as date-time instants. */
    scaleYDatetime(options: TemporalScaleOptions = {}) {
      return this.scales(scaleYDatetime(options));
    }

    /** Force x values to remain discrete categories. */
    scaleXDiscrete(options: DiscretePositionScaleOptions = {}) {
      return this.scales(scaleXDiscrete(options));
    }

    /** Force y values to remain discrete categories. */
    scaleYDiscrete(options: DiscretePositionScaleOptions = {}) {
      return this.scales(scaleYDiscrete(options));
    }

    /** Configure the x scale as a continuous linear scale. */
    scaleXContinuous(options: ContinuousPositionScaleOptions = {}) {
      return this.scales(scaleXContinuous(options));
    }

    /** Configure the y scale as a continuous linear scale. */
    scaleYContinuous(options: ContinuousPositionScaleOptions = {}) {
      return this.scales(scaleYContinuous(options));
    }

    /** Configure the x scale as a base-10 log scale (pre-stat log10 transform). */
    scaleXLog10(options: TransformedPositionScaleOptions = {}) {
      return this.scales(scaleXLog10(options));
    }

    /** Configure the y scale as a base-10 log scale (pre-stat log10 transform). */
    scaleYLog10(options: TransformedPositionScaleOptions = {}) {
      return this.scales(scaleYLog10(options));
    }

    /** Configure the x scale as a square-root scale (pre-stat sqrt transform). */
    scaleXSqrt(options: TransformedPositionScaleOptions = {}) {
      return this.scales(scaleXSqrt(options));
    }

    /** Configure the y scale as a square-root scale (pre-stat sqrt transform). */
    scaleYSqrt(options: TransformedPositionScaleOptions = {}) {
      return this.scales(scaleYSqrt(options));
    }

    /** Reverse the x scale's output direction. */
    scaleXReverse(options: Omit<ContinuousPositionScaleOptions, "transform" | "reverse"> = {}) {
      return this.scales(scaleXReverse(options));
    }

    /** Reverse the y scale's output direction. */
    scaleYReverse(options: Omit<ContinuousPositionScaleOptions, "transform" | "reverse"> = {}) {
      return this.scales(scaleYReverse(options));
    }

    /** Configure the x scale as a binned (ordered-bin) quantitative scale. */
    scaleXBinned(options: ContinuousPositionScaleOptions = {}) {
      return this.scales(scaleXBinned(options));
    }

    /** Configure the y scale as a binned (ordered-bin) quantitative scale. */
    scaleYBinned(options: ContinuousPositionScaleOptions = {}) {
      return this.scales(scaleYBinned(options));
    }

    /** Configure color as a continuous sequential ramp. */
    scaleColorContinuous(options: SequentialColorScaleOptions = {}) {
      return this.scales(scaleColorContinuous(options));
    }

    /** Configure color as discrete categories. */
    scaleColorDiscrete(options: DiscreteColorScaleOptions = {}) {
      return this.scales(scaleColorDiscrete(options));
    }

    /** Configure color as ordered quantitative bins. */
    scaleColorBinned(options: BinnedColorScaleOptions = {}) {
      return this.scales(scaleColorBinned(options));
    }

    /** Configure color as a pre-training base-10 transformed ramp. */
    scaleColorLog10(options: TransformedColorScaleOptions = {}) {
      return this.scales(scaleColorLog10(options));
    }

    /** Configure color as a pre-training square-root transformed ramp. */
    scaleColorSqrt(options: TransformedColorScaleOptions = {}) {
      return this.scales(scaleColorSqrt(options));
    }

    /** Configure color as calendar dates. */
    scaleColorDate(options: TemporalColorScaleOptions = {}) {
      return this.scales(scaleColorDate(options));
    }

    /** Configure color as date-time instants. */
    scaleColorDatetime(options: TemporalColorScaleOptions = {}) {
      return this.scales(scaleColorDatetime(options));
    }

    /** Configure an explicit color domain-to-value mapping. */
    scaleColorManual(options: ManualColorScaleOptions) {
      return this.scales(scaleColorManual(options));
    }

    /** Use validated source values directly as colors. */
    scaleColorIdentity(options: IdentityColorScaleOptions = {}) {
      return this.scales(scaleColorIdentity(options));
    }

    /** Configure fill as a continuous sequential ramp. */
    scaleFillContinuous(options: SequentialColorScaleOptions = {}) {
      return this.scales(scaleFillContinuous(options));
    }

    /** Configure fill as discrete categories. */
    scaleFillDiscrete(options: DiscreteColorScaleOptions = {}) {
      return this.scales(scaleFillDiscrete(options));
    }

    /** Configure fill as ordered quantitative bins. */
    scaleFillBinned(options: BinnedColorScaleOptions = {}) {
      return this.scales(scaleFillBinned(options));
    }

    /** Configure fill as a pre-training base-10 transformed ramp. */
    scaleFillLog10(options: TransformedColorScaleOptions = {}) {
      return this.scales(scaleFillLog10(options));
    }

    /** Configure fill as a pre-training square-root transformed ramp. */
    scaleFillSqrt(options: TransformedColorScaleOptions = {}) {
      return this.scales(scaleFillSqrt(options));
    }

    /** Configure fill as calendar dates. */
    scaleFillDate(options: TemporalColorScaleOptions = {}) {
      return this.scales(scaleFillDate(options));
    }

    /** Configure fill as date-time instants. */
    scaleFillDatetime(options: TemporalColorScaleOptions = {}) {
      return this.scales(scaleFillDatetime(options));
    }

    /** Configure an explicit fill domain-to-value mapping. */
    scaleFillManual(options: ManualColorScaleOptions) {
      return this.scales(scaleFillManual(options));
    }

    /** Use validated source values directly as fills. */
    scaleFillIdentity(options: IdentityColorScaleOptions = {}) {
      return this.scales(scaleFillIdentity(options));
    }
  };
}
