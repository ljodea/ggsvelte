/**
 * Enforced VR smoke inventory — single source of truth for which pixel
 * contracts run in CI. Gallery light previews are a separate inventory
 * (apps/docs/static/previews); do not grow this list to cover every example.
 *
 * Declaration order is the fixture order. Do not sort.
 */

export type SmokeTheme = "light" | "dark";

export type InteractionHandlerId =
  | "tooltip-pinned"
  | "legend-focus-committed"
  | "interval-selected"
  | "tool-rail"
  | "forced-colors"
  | "dark-tooltip";

export type ExampleSmokeScenario = {
  readonly id: string;
  readonly kind: "example";
  readonly exampleId: string;
  readonly theme: SmokeTheme;
  readonly basename: string;
};

export type InteractionSmokeScenario = {
  readonly id: string;
  readonly kind: "interaction";
  readonly theme: SmokeTheme;
  readonly basename: string;
  readonly handler: InteractionHandlerId;
};

export type SmokeScenario = ExampleSmokeScenario | InteractionSmokeScenario;

function example(exampleId: string, theme: SmokeTheme): ExampleSmokeScenario {
  const [category, name] = exampleId.split("/");
  if (category === undefined || name === undefined) {
    throw new Error(`invalid example id: ${exampleId}`);
  }
  return {
    id: `example:${exampleId}:${theme}`,
    kind: "example",
    exampleId,
    theme,
    basename: `${category}-${name}-${theme}.png`,
  };
}

function interaction(
  handler: InteractionHandlerId,
  basename: string,
  theme: SmokeTheme,
): InteractionSmokeScenario {
  return {
    id: `interaction:${handler}`,
    kind: "interaction",
    theme,
    basename,
    handler,
  };
}

/**
 * 17 seats: 11 example lights + 1 example dark + 5 interaction (incl. 1 dark).
 * Keep count in [15, 18] and ≥2 dark (see smoke-matrix.test.ts).
 */
export const SMOKE_SCENARIOS: readonly SmokeScenario[] = [
  example("point/scatter-color", "light"),
  example("point/scatter-color", "dark"),
  example("line/multi-series", "light"),
  example("bar/stacked", "light"),
  example("area/basic", "light"),
  example("histogram/basic", "light"),
  example("facet/wrap", "light"),
  example("point/canvas-scatter", "light"),
  example("smooth/loess-scatter", "light"),
  example("col/basic", "light"),
  example("boxplot/by-category", "light"),
  interaction("tooltip-pinned", "interaction-tooltip-pinned-light.png", "light"),
  interaction("legend-focus-committed", "interaction-legend-focus-committed-light.png", "light"),
  interaction("interval-selected", "interaction-interval-selected-light.png", "light"),
  interaction("tool-rail", "interaction-tool-rail-460-light.png", "light"),
  interaction("dark-tooltip", "interaction-tooltip-dark.png", "dark"),
  interaction("forced-colors", "interaction-zoom-draft-forced-colors.png", "light"),
] as const;

export const SMOKE_BASE_NAMES: readonly string[] = SMOKE_SCENARIOS.map((s) => s.basename);

export const INTERACTION_HANDLERS: readonly InteractionHandlerId[] = [
  "tooltip-pinned",
  "legend-focus-committed",
  "interval-selected",
  "tool-rail",
  "forced-colors",
  "dark-tooltip",
];

export function smokeExampleIds(): readonly string[] {
  return [
    ...new Set(
      SMOKE_SCENARIOS.filter((s): s is ExampleSmokeScenario => s.kind === "example").map(
        (s) => s.exampleId,
      ),
    ),
  ];
}
