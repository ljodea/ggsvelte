/**
 * Tableau ordered-sequential and ordered-diverging gradient ramps
 * (ggthemes tableau_gradient_pal / scale_*_gradient_tableau family).
 *
 * Values are verbatim copies of the upstream YAML tables
 * (ggthemes data-raw/theme-data/tableau.yml), in source order. Stop counts
 * vary (7 for the light/diverging ramps, 20–21 for the single-hue ramps);
 * ramps are interpolation tables for continuous/binned scales and are
 * re-sampled by the colorbar, so they are not subject to MAX_PAINT_STOPS.
 *
 * Pure data — resolution falls through here from
 * `resolveSequentialPipelineRange` / `resolveOrdinalPaletteStops` after the
 * viridis-family and ColorBrewer tables. Named tables stay module-private
 * (knip): public consumers resolve via {@link tableauRampStops}.
 */
/** ggthemes tableau_gradient_pal("Blue-Green Sequential") — 7 stops, verbatim. */
const TABLEAU_SEQ_BLUE_GREEN_RAMP: readonly string[] = [
  "#feffd9",
  "#f2fabf",
  "#dff3b2",
  "#c4eab1",
  "#94d6b7",
  "#69c5be",
  "#41b7c4",
];

/** ggthemes tableau_gradient_pal("Blue Light") — 7 stops, verbatim. */
const TABLEAU_SEQ_BLUE_LIGHT_RAMP: readonly string[] = [
  "#e5e5e5",
  "#e0e3e8",
  "#dbe1ea",
  "#d5dfec",
  "#d0dcef",
  "#cadaf1",
  "#c4d8f3",
];

/** ggthemes tableau_gradient_pal("Orange Light") — 7 stops, verbatim. */
const TABLEAU_SEQ_ORANGE_LIGHT_RAMP: readonly string[] = [
  "#e5e5e5",
  "#ebe1d9",
  "#f0ddcd",
  "#f5d9c2",
  "#f9d4b6",
  "#fdd0aa",
  "#ffcc9e",
];

/** ggthemes tableau_gradient_pal("Blue") — 20 stops, verbatim. */
const TABLEAU_SEQ_BLUE_RAMP: readonly string[] = [
  "#b9ddf1",
  "#afd6ed",
  "#a5cfe9",
  "#9bc7e4",
  "#92c0df",
  "#89b8da",
  "#80b0d5",
  "#79aacf",
  "#72a3c9",
  "#6a9bc3",
  "#6394be",
  "#5b8cb8",
  "#5485b2",
  "#4e7fac",
  "#4878a6",
  "#437a9f",
  "#3d6a98",
  "#376491",
  "#305d8a",
  "#2a5783",
];

/** ggthemes tableau_gradient_pal("Orange") — 20 stops, verbatim. */
const TABLEAU_SEQ_ORANGE_RAMP: readonly string[] = [
  "#ffc685",
  "#fcbe75",
  "#f9b665",
  "#f7ae54",
  "#f5a645",
  "#f59c3c",
  "#f49234",
  "#f2882d",
  "#f07e27",
  "#ee7422",
  "#e96b20",
  "#e36420",
  "#db5e20",
  "#d25921",
  "#ca5422",
  "#c14f22",
  "#b84b23",
  "#af4623",
  "#a64122",
  "#9e3d22",
];

/** ggthemes tableau_gradient_pal("Green") — 20 stops, verbatim. */
const TABLEAU_SEQ_GREEN_RAMP: readonly string[] = [
  "#b3e0a6",
  "#a5db96",
  "#98d687",
  "#8ed07f",
  "#85ca77",
  "#7dc370",
  "#75bc69",
  "#6eb663",
  "#67af5c",
  "#61a956",
  "#59a253",
  "#519c51",
  "#49964f",
  "#428f4d",
  "#398949",
  "#308344",
  "#2b7c40",
  "#27763d",
  "#256f3d",
  "#24693d",
];

/** ggthemes tableau_gradient_pal("Red") — 20 stops, verbatim. */
const TABLEAU_SEQ_RED_RAMP: readonly string[] = [
  "#ffbeb2",
  "#feb4a6",
  "#fdab9b",
  "#fca290",
  "#fb9984",
  "#fa8f79",
  "#f9856e",
  "#f77b66",
  "#f5715d",
  "#f36754",
  "#f05c4d",
  "#ec5049",
  "#e74545",
  "#e13b42",
  "#da323f",
  "#d3293d",
  "#ca223c",
  "#c11a3b",
  "#b8163a",
  "#ae123a",
];

/** ggthemes tableau_gradient_pal("Purple") — 20 stops, verbatim. */
const TABLEAU_SEQ_PURPLE_RAMP: readonly string[] = [
  "#eec9e5",
  "#eac1df",
  "#e6b9d9",
  "#e0b2d2",
  "#daabcb",
  "#d5a4c4",
  "#cf9dbe",
  "#ca96b8",
  "#c48fb2",
  "#be89ac",
  "#b882a6",
  "#b27ba1",
  "#aa759d",
  "#a27099",
  "#9a6a96",
  "#926591",
  "#8c5f86",
  "#865986",
  "#81537f",
  "#7c4d79",
];

/** ggthemes tableau_gradient_pal("Brown") — 20 stops, verbatim. */
const TABLEAU_SEQ_BROWN_RAMP: readonly string[] = [
  "#eedbbd",
  "#ecd2ad",
  "#ebc994",
  "#eac085",
  "#e8b777",
  "#e5ae6c",
  "#e2a562",
  "#de9d5a",
  "#d99455",
  "#d38c54",
  "#ce8451",
  "#c9784d",
  "#c47247",
  "#c16941",
  "#bd6036",
  "#b85636",
  "#b34d34",
  "#ad4433",
  "#a63d32",
  "#9f3632",
];

/** ggthemes tableau_gradient_pal("Gray") — 20 stops, verbatim. */
const TABLEAU_SEQ_GRAY_RAMP: readonly string[] = [
  "#d5d5d5",
  "#cdcecd",
  "#c5c7c6",
  "#bcbfbe",
  "#b4b7b7",
  "#acb0b1",
  "#a4a9ab",
  "#9ca3a4",
  "#939c9e",
  "#8b9598",
  "#848e93",
  "#7c878d",
  "#758087",
  "#6e7a81",
  "#67737c",
  "#616c77",
  "#5b6570",
  "#555f6a",
  "#4f5864",
  "#49525e",
];

/**
 * ggthemes tableau_gradient_pal("Gray Warm") — 20 stops.
 * Upstream YAML has `#b047a4` (saturated magenta) at stop 7; neighbors are
 * `#b7afab` / `#a9a09d`. That is almost certainly a hex slip (`b0a8a4` →
 * `b047a4`). We ship the interpolated warm-gray `#b0a8a4` so the ramp stays
 * near-neutral; every other stop is verbatim from tableau.yml.
 */
const TABLEAU_SEQ_GRAY_WARM_RAMP: readonly string[] = [
  "#dcd4d0",
  "#d4ccc8",
  "#cdc4c0",
  "#c5bdb9",
  "#beb6b2",
  "#b7afab",
  "#b0a8a4",
  "#a9a09d",
  "#a29996",
  "#9b938f",
  "#948c88",
  "#8d8481",
  "#867e7b",
  "#807774",
  "#79706e",
  "#736967",
  "#6c6260",
  "#665c51",
  "#5f5654",
  "#59504e",
];

/** ggthemes tableau_gradient_pal("Blue-Teal") — 20 stops, verbatim. */
const TABLEAU_SEQ_BLUE_TEAL_RAMP: readonly string[] = [
  "#bce4d8",
  "#aedcd5",
  "#a1d5d2",
  "#95cecf",
  "#89c8cc",
  "#7ec1ca",
  "#72bac6",
  "#66b2c2",
  "#59acbe",
  "#4ba5ba",
  "#419eb6",
  "#3b96b2",
  "#358ead",
  "#3586a7",
  "#347ea1",
  "#32779b",
  "#316f96",
  "#2f6790",
  "#2d608a",
  "#2c5985",
];

/** ggthemes tableau_gradient_pal("Orange-Gold") — 20 stops, verbatim. */
const TABLEAU_SEQ_ORANGE_GOLD_RAMP: readonly string[] = [
  "#f4d166",
  "#f6c760",
  "#f8bc58",
  "#f8b252",
  "#f7a84a",
  "#f69e41",
  "#f49538",
  "#f38b2f",
  "#f28026",
  "#f0751e",
  "#eb6c1c",
  "#e4641e",
  "#de5d1f",
  "#d75521",
  "#cf4f22",
  "#c64a22",
  "#bc4623",
  "#b24223",
  "#a83e24",
  "#9e3a26",
];

/** ggthemes tableau_gradient_pal("Green-Gold") — 20 stops, verbatim. */
const TABLEAU_SEQ_GREEN_GOLD_RAMP: readonly string[] = [
  "#f4d166",
  "#e3cd62",
  "#d3c95f",
  "#c3c55d",
  "#b2c25b",
  "#a3bd5a",
  "#93b958",
  "#84b457",
  "#76af56",
  "#67a956",
  "#5aa355",
  "#4f9e53",
  "#479751",
  "#40914f",
  "#3a8a4d",
  "#34844a",
  "#2d7d45",
  "#257740",
  "#1c713b",
  "#146c36",
];

/** ggthemes tableau_gradient_pal("Red-Gold") — 21 stops, verbatim. */
const TABLEAU_SEQ_RED_GOLD_RAMP: readonly string[] = [
  "#f4d166",
  "#f5c75f",
  "#f6bc58",
  "#f7b254",
  "#f9a750",
  "#fa9d4f",
  "#fa9d4f",
  "#fb934d",
  "#f7894b",
  "#f47f4a",
  "#f0774a",
  "#eb6349",
  "#e66549",
  "#e15c48",
  "#dc5447",
  "#d64c45",
  "#d04344",
  "#ca3a42",
  "#c43141",
  "#bd273f",
  "#b71d3e",
];

/** ggthemes tableau_gradient_pal("Orange-Blue Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_ORANGE_BLUE_RAMP: readonly string[] = [
  "#9e3d22",
  "#d45b21",
  "#f69035",
  "#d9d5c9",
  "#77acd3",
  "#4f81af",
  "#2b5c8a",
];

/** ggthemes tableau_gradient_pal("Red-Green Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_RED_GREEN_RAMP: readonly string[] = [
  "#a3123a",
  "#e33f43",
  "#f8816b",
  "#ced7c3",
  "#73ba67",
  "#44914e",
  "#24693d",
];

/** ggthemes tableau_gradient_pal("Green-Blue Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_GREEN_BLUE_RAMP: readonly string[] = [
  "#24693d",
  "#45934d",
  "#75bc69",
  "#c9dad2",
  "#77a9cf",
  "#4e7fab",
  "#2a5783",
];

/** ggthemes tableau_gradient_pal("Red-Blue Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_RED_BLUE_RAMP: readonly string[] = [
  "#a90c38",
  "#e03b42",
  "#f87f69",
  "#dfd4d1",
  "#7eaed3",
  "#5383af",
  "#2e5a87",
];

/** ggthemes tableau_gradient_pal("Red-Black Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_RED_BLACK_RAMP: readonly string[] = [
  "#ae123a",
  "#e33e43",
  "#f8816b",
  "#d9d9d9",
  "#a0a7a8",
  "#707c83",
  "#49525e",
];

/** ggthemes tableau_gradient_pal("Gold-Purple Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_GOLD_PURPLE_RAMP: readonly string[] = [
  "#ad9024",
  "#c1a33b",
  "#d4b95e",
  "#e3d8cf",
  "#d4a3c3",
  "#c189b0",
  "#ac7299",
];

/** ggthemes tableau_gradient_pal("Red-Green-Gold Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_RED_GREEN_GOLD_RAMP: readonly string[] = [
  "#be2a3e",
  "#e25f48",
  "#f88f4d",
  "#f4d166",
  "#90b960",
  "#4b9b5f",
  "#22763f",
];

/** ggthemes tableau_gradient_pal("Sunset-Sunrise Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_SUNSET_SUNRISE_RAMP: readonly string[] = [
  "#33608c",
  "#9768a5",
  "#e7718a",
  "#f6ba57",
  "#ed7846",
  "#d54c45",
  "#b81840",
];

/** ggthemes tableau_gradient_pal("Orange-Blue-White Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_ORANGE_BLUE_WHITE_RAMP: readonly string[] = [
  "#9e3d22",
  "#e36621",
  "#fcad52",
  "#ffffff",
  "#95c5e1",
  "#5b8fbc",
  "#2b5c8a",
];

/** ggthemes tableau_gradient_pal("Red-Green-White Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_RED_GREEN_WHITE_RAMP: readonly string[] = [
  "#ae123a",
  "#ee574d",
  "#fdac9e",
  "#ffffff",
  "#91d183",
  "#539e52",
  "#24693d",
];

/** ggthemes tableau_gradient_pal("Green-Blue-White Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_GREEN_BLUE_WHITE_RAMP: readonly string[] = [
  "#24693d",
  "#529c51",
  "#8fd180",
  "#ffffff",
  "#95c1dd",
  "#598ab5",
  "#2a5783",
];

/** ggthemes tableau_gradient_pal("Red-Blue-White Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_RED_BLUE_WHITE_RAMP: readonly string[] = [
  "#a90c38",
  "#ec534b",
  "#feaa9a",
  "#ffffff",
  "#9ac4e1",
  "#5c8db8",
  "#2e5a87",
];

/** ggthemes tableau_gradient_pal("Red-Black-White Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_RED_BLACK_WHITE_RAMP: readonly string[] = [
  "#ae123a",
  "#ee574d",
  "#fdac9d",
  "#ffffff",
  "#bdc0bf",
  "#7d888d",
  "#49525e",
];

/** ggthemes tableau_gradient_pal("Orange-Blue Light Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_ORANGE_BLUE_LIGHT_RAMP: readonly string[] = [
  "#ffcc9e",
  "#f9d4b6",
  "#f0dccd",
  "#e5e5e5",
  "#dae1ea",
  "#cfdcef",
  "#c4d8f3",
];

/** ggthemes tableau_gradient_pal("Temperature Diverging") — 7 stops, verbatim. */
const TABLEAU_DIV_TEMPERATURE_RAMP: readonly string[] = [
  "#529985",
  "#6c9e6e",
  "#99b059",
  "#dbcf47",
  "#ebc24b",
  "#e3a14f",
  "#c26b51",
];

/** Named Tableau ramps keyed by portable scheme name. */
const TABLEAU_RAMPS = {
  tableau_seq_blue_green: TABLEAU_SEQ_BLUE_GREEN_RAMP,
  tableau_seq_blue_light: TABLEAU_SEQ_BLUE_LIGHT_RAMP,
  tableau_seq_orange_light: TABLEAU_SEQ_ORANGE_LIGHT_RAMP,
  tableau_seq_blue: TABLEAU_SEQ_BLUE_RAMP,
  tableau_seq_orange: TABLEAU_SEQ_ORANGE_RAMP,
  tableau_seq_green: TABLEAU_SEQ_GREEN_RAMP,
  tableau_seq_red: TABLEAU_SEQ_RED_RAMP,
  tableau_seq_purple: TABLEAU_SEQ_PURPLE_RAMP,
  tableau_seq_brown: TABLEAU_SEQ_BROWN_RAMP,
  tableau_seq_gray: TABLEAU_SEQ_GRAY_RAMP,
  tableau_seq_gray_warm: TABLEAU_SEQ_GRAY_WARM_RAMP,
  tableau_seq_blue_teal: TABLEAU_SEQ_BLUE_TEAL_RAMP,
  tableau_seq_orange_gold: TABLEAU_SEQ_ORANGE_GOLD_RAMP,
  tableau_seq_green_gold: TABLEAU_SEQ_GREEN_GOLD_RAMP,
  tableau_seq_red_gold: TABLEAU_SEQ_RED_GOLD_RAMP,
  tableau_div_orange_blue: TABLEAU_DIV_ORANGE_BLUE_RAMP,
  tableau_div_red_green: TABLEAU_DIV_RED_GREEN_RAMP,
  tableau_div_green_blue: TABLEAU_DIV_GREEN_BLUE_RAMP,
  tableau_div_red_blue: TABLEAU_DIV_RED_BLUE_RAMP,
  tableau_div_red_black: TABLEAU_DIV_RED_BLACK_RAMP,
  tableau_div_gold_purple: TABLEAU_DIV_GOLD_PURPLE_RAMP,
  tableau_div_red_green_gold: TABLEAU_DIV_RED_GREEN_GOLD_RAMP,
  tableau_div_sunset_sunrise: TABLEAU_DIV_SUNSET_SUNRISE_RAMP,
  tableau_div_orange_blue_white: TABLEAU_DIV_ORANGE_BLUE_WHITE_RAMP,
  tableau_div_red_green_white: TABLEAU_DIV_RED_GREEN_WHITE_RAMP,
  tableau_div_green_blue_white: TABLEAU_DIV_GREEN_BLUE_WHITE_RAMP,
  tableau_div_red_blue_white: TABLEAU_DIV_RED_BLUE_WHITE_RAMP,
  tableau_div_red_black_white: TABLEAU_DIV_RED_BLACK_WHITE_RAMP,
  tableau_div_orange_blue_light: TABLEAU_DIV_ORANGE_BLUE_LIGHT_RAMP,
  tableau_div_temperature: TABLEAU_DIV_TEMPERATURE_RAMP,
} as const;

/** Resolve a Tableau ramp by portable scheme name, or undefined. */
export function tableauRampStops(name: string): readonly string[] | undefined {
  if (Object.hasOwn(TABLEAU_RAMPS, name)) {
    return TABLEAU_RAMPS[name as keyof typeof TABLEAU_RAMPS];
  }
  return undefined;
}
