/** Resolve guide precedence, visibility, strict merge identity, and ordering. */
import type { GuideSpec, GuidesSpec, Scales, StyleAesthetic } from "@ggsvelte/spec";

import type { GuidePlan } from "../layout/guide-plan-types.js";
import type { DiscreteLegendInput, LegendInput, ResolvedLegendAppearance } from "../legend.js";
import { encodeKey } from "../scales/state.js";

import { PipelineError, type LayerBinding } from "./types.js";

type GuideAesthetic = "x" | "y" | "color" | "fill" | StyleAesthetic;
type NonPositionAesthetic = Exclude<GuideAesthetic, "x" | "y">;

type NonPositionGuide = Exclude<GuideSpec, { type: "axis" }>;
type LegendKeyStyle = ReturnType<NonNullable<DiscreteLegendInput["keyOf"]>>;

function typedGuide(value: unknown): GuideSpec | undefined {
  if (typeof value !== "object" || value === null || !("type" in value)) return undefined;
  return value as GuideSpec;
}

export interface AxisGuideAppearance {
  visible: boolean;
  title?: string;
  showTicks: boolean;
  showLabels: boolean;
  collision: "auto" | "preserve" | "ellipsis";
  theme?: import("@ggsvelte/spec").GuideThemeSpec;
}

export function resolveAxisGuide(
  aesthetic: "x" | "y",
  scales: Scales,
  guides: GuidesSpec | undefined,
): AxisGuideAppearance {
  const local = typedGuide(scales[aesthetic]?.guide);
  const top = guides?.[aesthetic];
  if (top?.type === "none" || (top === undefined && local?.type === "none")) {
    return { visible: false, showTicks: false, showLabels: false, collision: "auto" };
  }
  const localAxis = local?.type === "axis" ? local : undefined;
  const chosen =
    top?.type === "axis"
      ? { ...localAxis, ...top, theme: { ...localAxis?.theme, ...top.theme } }
      : top === undefined
        ? localAxis
        : undefined;
  return {
    visible: true,
    ...(chosen?.title !== undefined && { title: chosen.title }),
    showTicks: chosen?.showTicks ?? true,
    showLabels: chosen?.showLabels ?? true,
    collision: chosen?.collision ?? "auto",
    ...(chosen?.theme !== undefined && { theme: chosen.theme }),
  };
}

export interface LegendResolutionItem {
  input: LegendInput | null;
  plan: Exclude<GuidePlan, { type: "axis" }> | null;
}

function effectiveGuide(
  aesthetic: GuideAesthetic,
  defaultType: "legend" | "colorbar" | "colorsteps",
  scales: Scales,
  guides: GuidesSpec | undefined,
): NonPositionGuide {
  const local = typedGuide(scales[aesthetic]?.guide);
  const top = guides?.[aesthetic];
  const fallback = { type: defaultType } as NonPositionGuide;
  if (local === undefined && top === undefined) return fallback;
  if (top === undefined) return local as NonPositionGuide;
  if (local === undefined || local.type !== top.type) return top as NonPositionGuide;
  return {
    ...local,
    ...top,
    ...(local.type !== "none" &&
      top.type !== "none" &&
      (local.theme !== undefined || top.theme !== undefined) && {
        theme: { ...local.theme, ...top.theme },
      }),
  } as NonPositionGuide;
}

function sourceIdentity(
  aesthetic: NonPositionAesthetic,
  bindings: readonly LayerBinding[],
): string {
  const fields = new Set<string>();
  for (const binding of bindings) {
    const style = binding[aesthetic];
    if (style.field !== null) fields.add(`field:${style.field}`);
    else if ("statColumn" in style && style.statColumn !== null)
      fields.add(`stat:${style.statColumn}`);
    else if (style.scaledConstant !== null)
      fields.add(`constant:${encodeKey(style.scaledConstant)}`);
  }
  return [...fields].toSorted().join("|");
}

function appearanceOf(guide: NonPositionGuide, title: string): ResolvedLegendAppearance {
  if (guide.type === "none") {
    return { type: "none", title, order: 0, position: "auto", direction: "auto" };
  }
  return {
    type: guide.type,
    title: guide.title ?? title,
    order: guide.order ?? 0,
    position: guide.position ?? "auto",
    direction: guide.direction ?? "auto",
    ...(guide.type === "legend" && guide.keySize !== undefined && { keySize: guide.keySize }),
    ...(guide.collision !== undefined && { collision: guide.collision }),
    ...(guide.force !== undefined && { force: guide.force }),
    ...(guide.theme !== undefined && { theme: guide.theme }),
    ...("showTicks" in guide && guide.showTicks !== undefined && { showTicks: guide.showTicks }),
    ...("showLabels" in guide &&
      guide.showLabels !== undefined && { showLabels: guide.showLabels }),
  };
}

function appearanceIdentity(appearance: ResolvedLegendAppearance) {
  const theme = appearance.theme;
  return {
    type: appearance.type,
    title: appearance.title,
    order: appearance.order,
    position: appearance.position,
    direction: appearance.direction,
    keySize: appearance.keySize ?? null,
    collision: appearance.collision ?? null,
    force: appearance.force ?? false,
    showTicks: appearance.showTicks ?? true,
    showLabels: appearance.showLabels ?? true,
    theme:
      theme === undefined
        ? null
        : {
            titleSize: theme.titleSize ?? null,
            labelSize: theme.labelSize ?? null,
            keyGap: theme.keyGap ?? null,
            rowGap: theme.rowGap ?? null,
            blockGap: theme.blockGap ?? null,
            colorbarThickness: theme.colorbarThickness ?? null,
            colorbarLength: theme.colorbarLength ?? null,
          },
  };
}

function mergeIdentity(
  input: DiscreteLegendInput,
  plan: Exclude<GuidePlan, { type: "axis" }>,
  source: string,
  appearance: ResolvedLegendAppearance,
): string {
  if (plan.type !== "discrete" || input.interactive === false) return `unique:${plan.id}`;
  return JSON.stringify({
    source,
    family: plan.scaleType,
    title: appearance.title,
    domain: plan.domain.map(encodeKey),
    labels: plan.entries.map((entry) => entry.label),
    distinguishesNaFromUnknown: encodeKey(plan.naValue) !== encodeKey(plan.unknownValue),
    interactive: input.interactive ?? true,
    appearance: appearanceIdentity(appearance),
  });
}

function mergeDiscrete(group: readonly DiscreteLegendInput[]): DiscreteLegendInput {
  const first = group[0]!;
  return {
    ...first,
    aesthetics: Object.freeze(group.flatMap((input) => input.aesthetics ?? [input.scale])),
    colorOf(value: unknown): string | undefined {
      for (const input of group) {
        const color = input.colorOf?.(value) ?? input.keyOf?.(value)?.color;
        if (color !== undefined) return color;
      }
      return undefined;
    },
    keyOf(value: unknown): LegendKeyStyle {
      const key: LegendKeyStyle = {};
      for (const input of group) Object.assign(key, input.keyOf?.(value));
      return key;
    },
  };
}

export function prepareLegendInputs(input: {
  items: readonly LegendResolutionItem[];
  bindings: readonly LayerBinding[];
  scales: Scales;
  guides: GuidesSpec | undefined;
}): LegendInput[] {
  const prepared: Array<{
    input: LegendInput;
    plan: Exclude<GuidePlan, { type: "axis" }>;
    identity: string;
  }> = [];
  for (const item of input.items) {
    if (item.input === null || item.plan === null) continue;
    const aesthetic = item.input.scale;
    const defaultType =
      item.input.kind === "ramp"
        ? "colorbar"
        : item.input.kind === "steps"
          ? "colorsteps"
          : "legend";
    const guide = effectiveGuide(aesthetic, defaultType, input.scales, input.guides);
    if (guide.type === "none") continue;
    const appearance = appearanceOf(guide, item.input.title);
    const expected = defaultType;
    if (appearance.type !== expected) {
      throw new PipelineError(
        "guide-aesthetic-incompatible",
        input.guides?.[aesthetic] === undefined
          ? `/scales/${aesthetic}/guide`
          : `/guides/${aesthetic}`,
        `The ${appearance.type} guide is incompatible with the trained ${expected} guide for ${aesthetic}. Use ${expected}, none, or choose a matching explicit scale family.`,
      );
    }
    if (
      item.plan.type === "discrete" &&
      (item.plan.scaleType === "manual" || item.plan.scaleType === "identity") &&
      item.plan.entries.length < 2 &&
      appearance.force !== true
    ) {
      continue;
    }
    const decorated = {
      ...item.input,
      title: appearance.title,
      aesthetics: Object.freeze([item.input.scale]),
      appearance,
    } as LegendInput;
    prepared.push({
      input: decorated,
      plan: item.plan,
      identity:
        decorated.kind === "discrete"
          ? mergeIdentity(
              decorated,
              item.plan,
              sourceIdentity(aesthetic, input.bindings),
              appearance,
            )
          : `unique:${item.plan.id}`,
    });
  }

  const out: LegendInput[] = [];
  const merged = new Set<number>();
  for (let index = 0; index < prepared.length; index++) {
    if (merged.has(index)) continue;
    const current = prepared[index]!;
    if (current.input.kind !== "discrete" || current.identity.startsWith("unique:")) {
      out.push(current.input);
      continue;
    }
    const group = [current.input];
    for (let other = index + 1; other < prepared.length; other++) {
      const candidate = prepared[other]!;
      if (candidate.identity !== current.identity || candidate.input.kind !== "discrete") continue;
      merged.add(other);
      group.push(candidate.input);
    }
    out.push(mergeDiscrete(group));
  }
  return out.toSorted(
    (left, right) => (left.appearance?.order ?? 0) - (right.appearance?.order ?? 0),
  );
}
