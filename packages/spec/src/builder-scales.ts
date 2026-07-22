/**
 * Fluent builder scale sugar methods (thin wrappers over scale-helpers).
 * Core builder: builder-core.ts. Public GGBuilder: builder.ts.
 */
import type { GGBuilder } from "./builder.js";
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

/** Host must expose scales() returning the public fluent builder type. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixin host constructor
type ScaleHostConstructor = new (...args: any[]) => {
  scales(scales: Scales): GGBuilder;
};

/**
 * Mixin that adds scaleX/Y/Color/Fill sugar methods.
 * Every method is annotated to return GGBuilder so fluent chains keep full typing.
 */
export function WithBuilderScales<TBase extends ScaleHostConstructor>(Base: TBase) {
  return class extends Base {
    /** Configure the x scale as calendar dates. */
    scaleXDate(options: TemporalScaleOptions = {}): GGBuilder {
      return this.scales(scaleXDate(options));
    }

    /** Configure the x scale as date-time instants. */
    scaleXDatetime(options: TemporalScaleOptions = {}): GGBuilder {
      return this.scales(scaleXDatetime(options));
    }

    /** Configure the y scale as calendar dates. */
    scaleYDate(options: TemporalScaleOptions = {}): GGBuilder {
      return this.scales(scaleYDate(options));
    }

    /** Configure the y scale as date-time instants. */
    scaleYDatetime(options: TemporalScaleOptions = {}): GGBuilder {
      return this.scales(scaleYDatetime(options));
    }

    /** Force x values to remain discrete categories. */
    scaleXDiscrete(options: DiscretePositionScaleOptions = {}): GGBuilder {
      return this.scales(scaleXDiscrete(options));
    }

    /** Force y values to remain discrete categories. */
    scaleYDiscrete(options: DiscretePositionScaleOptions = {}): GGBuilder {
      return this.scales(scaleYDiscrete(options));
    }

    /** Configure the x scale as a continuous linear scale. */
    scaleXContinuous(options: ContinuousPositionScaleOptions = {}): GGBuilder {
      return this.scales(scaleXContinuous(options));
    }

    /** Configure the y scale as a continuous linear scale. */
    scaleYContinuous(options: ContinuousPositionScaleOptions = {}): GGBuilder {
      return this.scales(scaleYContinuous(options));
    }

    /** Configure the x scale as a base-10 log scale (pre-stat log10 transform). */
    scaleXLog10(options: TransformedPositionScaleOptions = {}): GGBuilder {
      return this.scales(scaleXLog10(options));
    }

    /** Configure the y scale as a base-10 log scale (pre-stat log10 transform). */
    scaleYLog10(options: TransformedPositionScaleOptions = {}): GGBuilder {
      return this.scales(scaleYLog10(options));
    }

    /** Configure the x scale as a square-root scale (pre-stat sqrt transform). */
    scaleXSqrt(options: TransformedPositionScaleOptions = {}): GGBuilder {
      return this.scales(scaleXSqrt(options));
    }

    /** Configure the y scale as a square-root scale (pre-stat sqrt transform). */
    scaleYSqrt(options: TransformedPositionScaleOptions = {}): GGBuilder {
      return this.scales(scaleYSqrt(options));
    }

    /** Reverse the x scale's output direction. */
    scaleXReverse(
      options: Omit<ContinuousPositionScaleOptions, "transform" | "reverse"> = {},
    ): GGBuilder {
      return this.scales(scaleXReverse(options));
    }

    /** Reverse the y scale's output direction. */
    scaleYReverse(
      options: Omit<ContinuousPositionScaleOptions, "transform" | "reverse"> = {},
    ): GGBuilder {
      return this.scales(scaleYReverse(options));
    }

    /** Configure the x scale as a binned (ordered-bin) quantitative scale. */
    scaleXBinned(options: ContinuousPositionScaleOptions = {}): GGBuilder {
      return this.scales(scaleXBinned(options));
    }

    /** Configure the y scale as a binned (ordered-bin) quantitative scale. */
    scaleYBinned(options: ContinuousPositionScaleOptions = {}): GGBuilder {
      return this.scales(scaleYBinned(options));
    }

    /** Configure color as a continuous sequential ramp. */
    scaleColorContinuous(options: SequentialColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleColorContinuous(options));
    }

    /** Configure color as discrete categories. */
    scaleColorDiscrete(options: DiscreteColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleColorDiscrete(options));
    }

    /** Configure color as ordered quantitative bins. */
    scaleColorBinned(options: BinnedColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleColorBinned(options));
    }

    /** Configure color as a pre-training base-10 transformed ramp. */
    scaleColorLog10(options: TransformedColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleColorLog10(options));
    }

    /** Configure color as a pre-training square-root transformed ramp. */
    scaleColorSqrt(options: TransformedColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleColorSqrt(options));
    }

    /** Configure color as calendar dates. */
    scaleColorDate(options: TemporalColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleColorDate(options));
    }

    /** Configure color as date-time instants. */
    scaleColorDatetime(options: TemporalColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleColorDatetime(options));
    }

    /** Configure an explicit color domain-to-value mapping. */
    scaleColorManual(options: ManualColorScaleOptions): GGBuilder {
      return this.scales(scaleColorManual(options));
    }

    /** Use validated source values directly as colors. */
    scaleColorIdentity(options: IdentityColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleColorIdentity(options));
    }

    /** Configure fill as a continuous sequential ramp. */
    scaleFillContinuous(options: SequentialColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleFillContinuous(options));
    }

    /** Configure fill as discrete categories. */
    scaleFillDiscrete(options: DiscreteColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleFillDiscrete(options));
    }

    /** Configure fill as ordered quantitative bins. */
    scaleFillBinned(options: BinnedColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleFillBinned(options));
    }

    /** Configure fill as a pre-training base-10 transformed ramp. */
    scaleFillLog10(options: TransformedColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleFillLog10(options));
    }

    /** Configure fill as a pre-training square-root transformed ramp. */
    scaleFillSqrt(options: TransformedColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleFillSqrt(options));
    }

    /** Configure fill as calendar dates. */
    scaleFillDate(options: TemporalColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleFillDate(options));
    }

    /** Configure fill as date-time instants. */
    scaleFillDatetime(options: TemporalColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleFillDatetime(options));
    }

    /** Configure an explicit fill domain-to-value mapping. */
    scaleFillManual(options: ManualColorScaleOptions): GGBuilder {
      return this.scales(scaleFillManual(options));
    }

    /** Use validated source values directly as fills. */
    scaleFillIdentity(options: IdentityColorScaleOptions = {}): GGBuilder {
      return this.scales(scaleFillIdentity(options));
    }
  };
}
