import type { CoordTransformAxisSpec } from "@ggsvelte/spec";

import { PipelineError } from "./pipeline/types.js";
import type { PositionScale } from "./scales/train.js";
import { scaleTransform } from "./scales/transform.js";

export interface CoordAxisProjector {
  readonly axis: "x" | "y";
  readonly transform: CoordTransformAxisSpec["transform"];
  readonly active: boolean;
  readonly coordinateDomain: readonly [number, number];
  /** Existing scale-normalized fraction -> post-stat coordinate fraction. */
  projectFraction(fraction: number): number;
  /** Coordinate fraction -> existing scale-normalized fraction. */
  invertFraction(fraction: number): number;
}

function docs(code: string): string {
  return `https://ggsvelte.sh/guide/errors#${code}`;
}

function failure(
  code: string,
  axis: "x" | "y",
  problem: string,
  cause: string,
  fixes: readonly { description: string; portable?: unknown }[],
): never {
  throw new PipelineError(code, `/coord/${axis}`, cause, {
    code,
    severity: "error",
    path: `/coord/${axis}`,
    problem,
    cause,
    fixes,
    documentationUrl: docs(code),
  });
}

function identityProjector(axis: "x" | "y", reverse: boolean): CoordAxisProjector {
  return {
    axis,
    transform: "identity",
    active: reverse,
    coordinateDomain: [0, 1],
    projectFraction: reverse ? (fraction) => 1 - fraction : (fraction) => fraction,
    invertFraction: reverse ? (fraction) => 1 - fraction : (fraction) => fraction,
  };
}

/**
 * Build one post-stat coordinate projector over an already-trained position
 * scale. The input fraction is the scale's affine output; reconstruction of
 * scale space means coordinate transforms never forward semantic values twice.
 */
export function buildCoordAxisProjector(
  axis: "x" | "y",
  scale: PositionScale,
  config: CoordTransformAxisSpec | undefined,
): CoordAxisProjector {
  const transformName = config?.transform ?? "identity";
  const reverse = config?.reverse === true;
  const hasLimits = config?.limits !== undefined;

  if (scale.type === "band") {
    if (transformName !== "identity") {
      failure(
        "coord-transform-continuous",
        axis,
        `The ${axis} coordinate transform requires a continuous scale.`,
        `The ${axis} scale is discrete/banded, so ${transformName} has no quantitative coordinate domain.`,
        [
          { description: `Use transform: "identity" for the ${axis} coordinate.` },
          { description: `Use a continuous or binned quantitative ${axis} scale.` },
        ],
      );
    }
    if (hasLimits) {
      failure(
        "coord-transform-continuous",
        axis,
        `Numeric coordinate limits require a continuous ${axis} scale.`,
        `The ${axis} scale is discrete/banded, so numeric limits cannot identify category boundaries.`,
        [{ description: `Remove coord ${axis}.limits or configure a continuous scale.` }],
      );
    }
    return identityProjector(axis, reverse);
  }

  if (scale.type === "time" && transformName !== "identity") {
    failure(
      "coord-transform-temporal",
      axis,
      `Temporal ${axis} coordinates permit only the identity transform.`,
      `Applying ${transformName} to epoch magnitudes would destroy calendar meaning.`,
      [
        { description: `Remove the ${axis} coordinate transform.` },
        { description: `Use identity coordinate limits/reverse for a temporal viewport.` },
      ],
    );
  }

  const scaleTx = scaleTransform(scale.transform);
  const coordTx = scaleTransform(transformName);
  const scaleDomain = scale.transformedDomain;
  let scaleLo = scaleDomain[0];
  let scaleHi = scaleDomain[1];
  if (config?.limits !== undefined) {
    const lo = config.limits[0]!;
    const hi = config.limits[1]!;
    if (
      !Number.isFinite(lo) ||
      !Number.isFinite(hi) ||
      lo === hi ||
      !scaleTx.valid(lo) ||
      !scaleTx.valid(hi)
    ) {
      failure(
        "coord-transform-domain",
        axis,
        `The ${axis} coordinate limits are invalid for the trained scale transform.`,
        `Expected two distinct finite semantic values inside the ${scale.transform} scale domain; received [${lo}, ${hi}].`,
        [{ description: `Choose finite ${axis} limits accepted by the scale transform.` }],
      );
    }
    scaleLo = scaleTx.forward(lo);
    scaleHi = scaleTx.forward(hi);
  }

  if (!hasLimits && (!coordTx.valid(scaleLo) || !coordTx.valid(scaleHi))) {
    // Scale nice/expansion may cross a coordinate transform's boundary even
    // when every trained value is valid (for example positive data expanded
    // below zero before coord log10). Fall back to the raw finite evidence;
    // coordinate projection owns its own post-stat display domain.
    [scaleLo, scaleHi] = scale.evidenceTransformedDomain;
  }

  if (!coordTx.valid(scaleLo) || !coordTx.valid(scaleHi)) {
    failure(
      "coord-transform-domain",
      axis,
      `The trained ${axis} coordinate domain is invalid for ${transformName}.`,
      `${transformName} cannot project scale-space endpoints [${scaleLo}, ${scaleHi}].`,
      [
        { description: `Choose coordinate limits inside the ${transformName} domain.` },
        { description: `Use transform: "identity" for this coordinate axis.` },
      ],
    );
  }

  let coordLo = coordTx.forward(scaleLo);
  let coordHi = coordTx.forward(scaleHi);
  if (!hasLimits && scaleLo === scaleHi && Number.isFinite(coordLo)) {
    // Raw evidence can be a valid singleton after scale nice/expansion crossed
    // the coordinate transform boundary. Pad in coordinate space so the
    // singleton stays centered without inventing invalid scale-space values.
    coordLo -= 0.5;
    coordHi += 0.5;
    if (transformName === "sqrt") coordLo = Math.max(0, coordLo);
  }
  if (coordLo === coordHi || !Number.isFinite(coordLo) || !Number.isFinite(coordHi)) {
    failure(
      "coord-transform-domain",
      axis,
      `The ${axis} coordinate transform produced a degenerate domain.`,
      `${transformName} projected [${scaleLo}, ${scaleHi}] to [${coordLo}, ${coordHi}].`,
      [{ description: `Choose distinct limits or a different coordinate transform.` }],
    );
  }

  if (hasLimits && config?.expand !== false) {
    const padding = (coordHi - coordLo) * 0.05;
    coordLo -= padding;
    coordHi += padding;
    if (transformName === "sqrt") {
      coordLo = Math.max(0, coordLo);
      coordHi = Math.max(0, coordHi);
    }
  }

  const coordSpan = coordHi - coordLo;
  const scaleSpan = scaleDomain[1] - scaleDomain[0];
  const scaleReversed =
    scale.normalizeTransformed(scaleDomain[0]) > scale.normalizeTransformed(scaleDomain[1]);
  const scaleValueAt = (fraction: number): number => {
    const affine = scaleReversed ? 1 - fraction : fraction;
    return scaleDomain[0] + affine * scaleSpan;
  };
  const scaleFractionAt = (value: number): number => {
    const affine = scaleSpan === 0 ? 0.5 : (value - scaleDomain[0]) / scaleSpan;
    return scaleReversed ? 1 - affine : affine;
  };
  const outputReversed = scaleReversed !== reverse;
  const projectFraction = (fraction: number): number => {
    const scaleValue = scaleValueAt(fraction);
    if (!coordTx.valid(scaleValue)) return Number.NaN;
    const projected = (coordTx.forward(scaleValue) - coordLo) / coordSpan;
    return outputReversed ? 1 - projected : projected;
  };
  const invertFraction = (fraction: number): number => {
    const projected = outputReversed ? 1 - fraction : fraction;
    const coordValue = coordLo + projected * coordSpan;
    return scaleFractionAt(coordTx.inverse(coordValue));
  };

  const active = transformName !== "identity" || reverse || hasLimits || config?.expand === false;
  return {
    axis,
    transform: transformName,
    active,
    coordinateDomain: [coordLo, coordHi],
    projectFraction,
    invertFraction,
  };
}

export interface PanelCoordProjector {
  readonly x: CoordAxisProjector;
  readonly y: CoordAxisProjector;
  readonly clip: boolean;
}

export function buildPanelCoordProjector(
  scales: { x: PositionScale; y: PositionScale },
  coord:
    | { type: "transform"; x?: CoordTransformAxisSpec; y?: CoordTransformAxisSpec; clip?: boolean }
    | undefined,
): PanelCoordProjector {
  return {
    x: buildCoordAxisProjector("x", scales.x, coord?.x),
    y: buildCoordAxisProjector("y", scales.y, coord?.y),
    clip: coord?.clip !== false,
  };
}
