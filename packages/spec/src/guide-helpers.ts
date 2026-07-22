import type {
  AxisGuideSpec,
  ColorbarGuideSpec,
  ColorstepsGuideSpec,
  GuidesSpec,
  LegendGuideSpec,
  NoneGuideSpec,
} from "./schema.js";

export type AxisGuideOptions = Omit<AxisGuideSpec, "type">;
export type LegendGuideOptions = Omit<LegendGuideSpec, "type">;
export type ColorbarGuideOptions = Omit<ColorbarGuideSpec, "type">;
export type ColorstepsGuideOptions = Omit<ColorstepsGuideSpec, "type">;

export function guideAxis(options: AxisGuideOptions = {}): AxisGuideSpec {
  return { type: "axis", ...options };
}

export function guideLegend(options: LegendGuideOptions = {}): LegendGuideSpec {
  return { type: "legend", ...options };
}

export function guideColorbar(options: ColorbarGuideOptions = {}): ColorbarGuideSpec {
  return { type: "colorbar", ...options };
}

export function guideColorsteps(options: ColorstepsGuideOptions = {}): ColorstepsGuideSpec {
  return { type: "colorsteps", ...options };
}

export function guideNone(): NoneGuideSpec {
  return { type: "none" };
}

/** Portable top-level guide fragment, mirroring scale helper fragments. */
export function guides(value: GuidesSpec): { guides: GuidesSpec } {
  return { guides: { ...value } };
}

export const guide_axis = guideAxis;
export const guide_legend = guideLegend;
export const guide_colorbar = guideColorbar;
export const guide_colorsteps = guideColorsteps;
export const guide_none = guideNone;
