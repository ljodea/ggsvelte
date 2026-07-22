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
import {
  scaleAlphaBinned,
  scaleAlphaContinuous,
  scaleAlphaDate,
  scaleAlphaDatetime,
  scaleAlphaDiscrete,
  scaleAlphaIdentity,
  scaleAlphaManual,
  scaleLinewidthBinned,
  scaleLinewidthContinuous,
  scaleLinewidthDate,
  scaleLinewidthDatetime,
  scaleLinewidthDiscrete,
  scaleLinewidthIdentity,
  scaleLinewidthManual,
  scaleLinetypeBinned,
  scaleLinetypeDiscrete,
  scaleLinetypeIdentity,
  scaleLinetypeManual,
  scaleShapeBinned,
  scaleShapeDiscrete,
  scaleShapeIdentity,
  scaleShapeManual,
  scaleSizeBinned,
  scaleSizeContinuous,
  scaleSizeDate,
  scaleSizeDatetime,
  scaleSizeDiscrete,
  scaleSizeIdentity,
  scaleSizeManual,
  type BinnedFiniteStyleScaleOptions,
  type DiscreteFiniteStyleScaleOptions,
  type DiscreteNumericStyleScaleOptions,
  type IdentityFiniteStyleScaleOptions,
  type IdentityNumericStyleScaleOptions,
  type ManualFiniteStyleScaleOptions,
  type ManualNumericStyleScaleOptions,
  type SequentialStyleScaleOptions,
  type TemporalNumericStyleScaleOptions,
} from "./scale-style-helpers.js";
import type { LinetypeName, PointShapeName } from "./schema-names.js";
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

    scaleSizeContinuous(options: SequentialStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleSizeContinuous(options));
    }
    scaleSizeDiscrete(options: DiscreteNumericStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleSizeDiscrete(options));
    }
    scaleSizeBinned(options: SequentialStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleSizeBinned(options));
    }
    scaleSizeDate(options: TemporalNumericStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleSizeDate(options));
    }
    scaleSizeDatetime(options: TemporalNumericStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleSizeDatetime(options));
    }
    scaleSizeManual(options: ManualNumericStyleScaleOptions): GGBuilder {
      return this.scales(scaleSizeManual(options));
    }
    scaleSizeIdentity(options: IdentityNumericStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleSizeIdentity(options));
    }

    scaleLinewidthContinuous(options: SequentialStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleLinewidthContinuous(options));
    }
    scaleLinewidthDiscrete(options: DiscreteNumericStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleLinewidthDiscrete(options));
    }
    scaleLinewidthBinned(options: SequentialStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleLinewidthBinned(options));
    }
    scaleLinewidthDate(options: TemporalNumericStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleLinewidthDate(options));
    }
    scaleLinewidthDatetime(options: TemporalNumericStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleLinewidthDatetime(options));
    }
    scaleLinewidthManual(options: ManualNumericStyleScaleOptions): GGBuilder {
      return this.scales(scaleLinewidthManual(options));
    }
    scaleLinewidthIdentity(options: IdentityNumericStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleLinewidthIdentity(options));
    }

    scaleAlphaContinuous(options: SequentialStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleAlphaContinuous(options));
    }
    scaleAlphaDiscrete(options: DiscreteNumericStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleAlphaDiscrete(options));
    }
    scaleAlphaBinned(options: SequentialStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleAlphaBinned(options));
    }
    scaleAlphaDate(options: TemporalNumericStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleAlphaDate(options));
    }
    scaleAlphaDatetime(options: TemporalNumericStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleAlphaDatetime(options));
    }
    scaleAlphaManual(options: ManualNumericStyleScaleOptions): GGBuilder {
      return this.scales(scaleAlphaManual(options));
    }
    scaleAlphaIdentity(options: IdentityNumericStyleScaleOptions = {}): GGBuilder {
      return this.scales(scaleAlphaIdentity(options));
    }

    scaleShapeDiscrete(options: DiscreteFiniteStyleScaleOptions<PointShapeName> = {}): GGBuilder {
      return this.scales(scaleShapeDiscrete(options));
    }
    scaleShapeBinned(options: BinnedFiniteStyleScaleOptions<PointShapeName> = {}): GGBuilder {
      return this.scales(scaleShapeBinned(options));
    }
    scaleShapeManual(options: ManualFiniteStyleScaleOptions<PointShapeName>): GGBuilder {
      return this.scales(scaleShapeManual(options));
    }
    scaleShapeIdentity(options: IdentityFiniteStyleScaleOptions<PointShapeName> = {}): GGBuilder {
      return this.scales(scaleShapeIdentity(options));
    }

    scaleLinetypeDiscrete(options: DiscreteFiniteStyleScaleOptions<LinetypeName> = {}): GGBuilder {
      return this.scales(scaleLinetypeDiscrete(options));
    }
    scaleLinetypeBinned(options: BinnedFiniteStyleScaleOptions<LinetypeName> = {}): GGBuilder {
      return this.scales(scaleLinetypeBinned(options));
    }
    scaleLinetypeManual(options: ManualFiniteStyleScaleOptions<LinetypeName>): GGBuilder {
      return this.scales(scaleLinetypeManual(options));
    }
    scaleLinetypeIdentity(options: IdentityFiniteStyleScaleOptions<LinetypeName> = {}): GGBuilder {
      return this.scales(scaleLinetypeIdentity(options));
    }
  };
}
