/**
 * Named categorical color palettes and scheme registry for ordinal color
 * scales. Pure data — training lives in train.ts.
 */
// Palettes live in @ggsvelte/spec (authoring + portable schemes). Core only
// consumes the frozen 10-stop tables for CATEGORICAL_SCHEMES — do not re-export
// builders here (knip: unused package exports).
import { GREY_PALETTE_10, HUE_PALETTE_10 } from "@ggsvelte/spec";

import { COLORBREWER_QUALITATIVE } from "./colorbrewer-palettes.js";

/**
 * Default categorical palette: 10 colors in the Observable 10 family.
 * The palette is a plain value — its fingerprint (not its identity) keys
 * scale-state invalidation.
 */
export const CATEGORICAL_PALETTE_10: readonly string[] = [
  "#4269d0",
  "#efb118",
  "#ff725c",
  "#6cc5b0",
  "#3ca951",
  "#ff8ab7",
  "#a463f2",
  "#97bbf5",
  "#9c6b4e",
  "#9498a0",
];

/** hrbrthemes::ipsum_palette, in its published source order. */
export const IPSUM_PALETTE: readonly string[] = [
  "#d18975",
  "#8fd175",
  "#3f2d54",
  "#75b8d1",
  "#2d543d",
  "#c9d175",
  "#d1ab75",
  "#d175b8",
  "#758bd1",
];

/** hrbrthemes::flexoki_light, the light-background qualitative palette. */
export const FLEXOKI_PALETTE: readonly string[] = [
  "#D14D41",
  "#DA702C",
  "#D0A215",
  "#879A39",
  "#3AA99F",
  "#4385BE",
  "#8B7EC8",
  "#CE5D97",
];

/** ggthemes' regular "Tableau 10" palette. */
export const TABLEAU10_PALETTE: readonly string[] = [
  "#4E79A7",
  "#F28E2B",
  "#E15759",
  "#76B7B2",
  "#59A14F",
  "#EDC948",
  "#B07AA1",
  "#FF9DA7",
  "#9C755F",
  "#BAB0AC",
];

/** ggthemes' eight-color qualitative colorblind-safe palette. */
export const COLORBLIND_PALETTE: readonly string[] = [
  "#000000",
  "#E69F00",
  "#56B4E9",
  "#009E73",
  "#F0E442",
  "#0072B2",
  "#D55E00",
  "#CC79A7",
];

/**
 * ggthemes economist_pal(fill = TRUE) at full capacity (n = 9 selection):
 * blue-gray, dark blue, blue, light blue, dark green, light green, dark red,
 * pink, gray. ggthemes re-selects per n; this port flattens to the fixed
 * full-capacity order (prefix subsets approximate the smaller-n picks).
 */
export const ECONOMIST_PALETTE: readonly string[] = [
  "#6794a7",
  "#014d64",
  "#01a2d9",
  "#7ad2f6",
  "#00887d",
  "#76c0c1",
  "#7c260b",
  "#ee8f71",
  "#adadad",
];

/**
 * ggthemes solarized_pal(accent = "blue") at full capacity: the eight
 * Solarized accents with the default blue first, then the remaining accents
 * in source order (ggthemes' max-L*a*b-distance pick is order-degenerate at
 * n = 8 and falls back to source order). ggthemes re-selects per n; this
 * port flattens to the fixed n = 8 order, so prefix subsets approximate the
 * smaller-n picks. The same accents serve light and dark panels — only the
 * base tones flip between the solarized/solarizeddark themes.
 */
export const SOLARIZED_PALETTE: readonly string[] = [
  "#268bd2",
  "#b58900",
  "#cb4b16",
  "#dc322f",
  "#d33682",
  "#6c71c4",
  "#2aa198",
  "#859900",
];

/**
 * ggthemes few_pal("Medium") — Stephen Few's medium-strength qualitative
 * palette (scale_colour_few default). ggthemes reserves its first value
 * (Gray) for non-data parts at n = 1; the data colors are the remaining
 * eight, and its n picks are prefix walks, so this fixed list is exactly
 * the ggthemes full-capacity order.
 */
export const FEW_PALETTE: readonly string[] = [
  "#5DA5DA",
  "#FAA43A",
  "#60BD68",
  "#F17CB0",
  "#B2912F",
  "#B276B2",
  "#DECF3F",
  "#F15854",
];

/** ggthemes few_pal("Light") — Few's light variant for filled areas (scale_fill_few default). */
export const FEW_LIGHT_PALETTE: readonly string[] = [
  "#88BDE6",
  "#FBB258",
  "#90CD97",
  "#F6AAC9",
  "#BFA554",
  "#BC99C7",
  "#EDDD46",
  "#F07E6E",
];

/** ggthemes few_pal("Dark") — Few's dark variant for thin lines / highlighting. */
export const FEW_DARK_PALETTE: readonly string[] = [
  "#265DAB",
  "#DF5C24",
  "#059748",
  "#E5126F",
  "#9D722A",
  "#7B3A96",
  "#C7B42E",
  "#CB2027",
];

/** ggthemes fivethirtyeight_pal() — the standard three-color 538 line palette: blue, red, green. */
export const FIVETHIRTYEIGHT_PALETTE: readonly string[] = ["#008FD5", "#FF2700", "#77AB43"];
/** ggthemes calc_pal() — the 12 LibreOffice Calc chart colors, in source order. */
export const CALC_PALETTE: readonly string[] = [
  "#004586",
  "#ff420e",
  "#ffd320",
  "#579d1c",
  "#7e0021",
  "#83caff",
  "#314004",
  "#aecf00",
  "#4b1f6f",
  "#ff950e",
  "#c5000b",
  "#0084d1",
];

/**
 * ggthemes ptol_pal() at full capacity (n = 12 selection) — Paul Tol's
 * qualitative palette (SRON/EPS/TN/09-002). ggthemes re-selects the set per
 * n; this port flattens to the fixed full-capacity order (prefix subsets
 * approximate the smaller-n picks), as with the economist palette.
 */
export const PTOL_PALETTE: readonly string[] = [
  "#332288",
  "#6699CC",
  "#88CCEE",
  "#44AA99",
  "#117733",
  "#999933",
  "#DDCC77",
  "#661100",
  "#CC6677",
  "#AA4466",
  "#882255",
  "#AA4499",
];

/**
 * ggthemes canva_pal("Fresh and bright") — the scale_*_canva default.
 * ggthemes ships 150 named four-color Canva palettes; only the default is
 * registered (documented subset).
 */
export const CANVA_PALETTE: readonly string[] = ["#f98866", "#ff420e", "#80bd9e", "#89da59"];
/** ggthemes excel_pal(line = TRUE) — the Excel 97 line/point palette (scale_colour_excel). */
export const EXCEL_PALETTE: readonly string[] = [
  "#FF00FF",
  "#FFFF00",
  "#00FFFF",
  "#800080",
  "#800000",
  "#008080",
  "#0000FF",
];

export const TABLEAU20_PALETTE: readonly string[] = [
  "#4E79A7",
  "#A0CBE8",
  "#F28E2B",
  "#FFBE7D",
  "#59A14F",
  "#8CD17D",
  "#B6992D",
  "#F1CE63",
  "#499894",
  "#86BCB6",
  "#E15759",
  "#FF9D9A",
  "#79706E",
  "#BAB0AC",
  "#D37295",
  "#FABFD2",
  "#B07AA1",
  "#D4A6C8",
  "#9D7660",
  "#D7B5A6",
];

/** ggthemes tableau_color_pal("Color Blind", "regular") — Tableau's colorblind-safe 10. */
export const TABLEAU_COLORBLIND_PALETTE: readonly string[] = [
  "#1170aa",
  "#fc7d0b",
  "#a3acb9",
  "#57606c",
  "#5fa2ce",
  "#c85200",
  "#7b848f",
  "#a3cce9",
  "#ffbc79",
  "#c8d0d9",
];

/** ggthemes tableau_color_pal("Seattle Grays", "regular"). */
export const TABLEAU_SEATTLE_GRAYS_PALETTE: readonly string[] = [
  "#767f8b",
  "#b3b7b8",
  "#5c6068",
  "#d3d3d3",
  "#989ca3",
];

/** ggthemes tableau_color_pal("Traffic", "regular") — red/yellow/green KPI triples. */
export const TABLEAU_TRAFFIC_PALETTE: readonly string[] = [
  "#b60a1c",
  "#e39802",
  "#309143",
  "#e03531",
  "#f0bd27",
  "#51b364",
  "#ff684c",
  "#ffda66",
  "#8ace7e",
];

/** ggthemes tableau_color_pal("Miller Stone", "regular"). */
export const TABLEAU_MILLER_STONE_PALETTE: readonly string[] = [
  "#4f6980",
  "#849db1",
  "#a2ceaa",
  "#638b66",
  "#bfbb60",
  "#f47942",
  "#fbb04e",
  "#b66353",
  "#d7ce9f",
  "#b9aa97",
  "#7e756d",
];

/** ggthemes tableau_color_pal("Superfishel Stone", "regular"). */
export const TABLEAU_SUPERFISHEL_STONE_PALETTE: readonly string[] = [
  "#6388b4",
  "#ffae34",
  "#ef6f6a",
  "#8cc2ca",
  "#55ad89",
  "#c3bc3f",
  "#bb7693",
  "#baa094",
  "#a9b5ae",
  "#767676",
];

/** ggthemes tableau_color_pal("Nuriel Stone", "regular"). */
export const TABLEAU_NURIEL_STONE_PALETTE: readonly string[] = [
  "#8175aa",
  "#6fb899",
  "#31a1b3",
  "#ccb22b",
  "#a39fc9",
  "#94d0c0",
  "#959c9e",
  "#027b8e",
  "#9f8f12",
];

/** ggthemes tableau_color_pal("Jewel Bright", "regular"). */
export const TABLEAU_JEWEL_BRIGHT_PALETTE: readonly string[] = [
  "#eb1e2c",
  "#fd6f30",
  "#f9a729",
  "#f9d23c",
  "#5fbb68",
  "#64cdcc",
  "#91dcea",
  "#a4a4d5",
  "#bbc9e5",
];

/** ggthemes tableau_color_pal("Summer", "regular"). */
export const TABLEAU_SUMMER_PALETTE: readonly string[] = [
  "#bfb202",
  "#b9ca5d",
  "#cf3e53",
  "#f1788d",
  "#00a2b3",
  "#97cfd0",
  "#f3a546",
  "#f7c480",
];

/** ggthemes tableau_color_pal("Winter", "regular"). */
export const TABLEAU_WINTER_PALETTE: readonly string[] = [
  "#90728f",
  "#b9a0b4",
  "#9d983d",
  "#cecb76",
  "#e15759",
  "#ff9888",
  "#6b6b6b",
  "#bab2ae",
  "#aa8780",
  "#dab6af",
];

/** ggthemes tableau_color_pal("Green-Orange-Teal", "regular"). */
export const TABLEAU_GREEN_ORANGE_TEAL_PALETTE: readonly string[] = [
  "#4e9f50",
  "#87d180",
  "#ef8a0c",
  "#fcc66d",
  "#3ca8bc",
  "#98d9e4",
  "#94a323",
  "#c3ce3d",
  "#a08400",
  "#f7d42a",
  "#26897e",
  "#8dbfa8",
];

/** ggthemes tableau_color_pal("Red-Blue-Brown", "regular"). */
export const TABLEAU_RED_BLUE_BROWN_PALETTE: readonly string[] = [
  "#466f9d",
  "#91b3d7",
  "#ed444a",
  "#feb5a2",
  "#9d7660",
  "#d7b5a6",
  "#3896c4",
  "#a0d4ee",
  "#ba7e45",
  "#39b87f",
  "#c8133b",
  "#ea8783",
];

/** ggthemes tableau_color_pal("Purple-Pink-Gray", "regular"). */
export const TABLEAU_PURPLE_PINK_GRAY_PALETTE: readonly string[] = [
  "#8074a8",
  "#c6c1f0",
  "#c46487",
  "#ffbed1",
  "#9c9290",
  "#c5bfbe",
  "#9b93c9",
  "#ddb5d5",
  "#7c7270",
  "#f498b6",
  "#b173a0",
  "#c799bc",
];

/** ggthemes tableau_color_pal("Hue Circle", "regular") — 19 steps around the hue wheel. */
export const TABLEAU_HUE_CIRCLE_PALETTE: readonly string[] = [
  "#1ba3c6",
  "#2cb5c0",
  "#30bcad",
  "#21B087",
  "#33a65c",
  "#57a337",
  "#a2b627",
  "#d5bb21",
  "#f8b620",
  "#f89217",
  "#f06719",
  "#e03426",
  "#f64971",
  "#fc719e",
  "#eb73b3",
  "#ce69be",
  "#a26dc2",
  "#7873c0",
  "#4f7cba",
];

/** ggthemes wsj_pal("colors6") — the default scale_*_wsj palette. */
export const WSJ_PALETTE: readonly string[] = [
  "#c72e29",
  "#016392",
  "#be9c2e",
  "#098154",
  "#fb832d",
  "#000000",
];

/** ggthemes wsj_pal("rgby") — red/green/blue/yellow. */
export const WSJ_RGBY_PALETTE: readonly string[] = ["#d3ba68", "#d5695d", "#5d8ca8", "#65a479"];

/** ggthemes wsj_pal("red_green") — green/red for good/bad. */
export const WSJ_RED_GREEN_PALETTE: readonly string[] = ["#088158", "#ba2f2a"];

/** ggthemes wsj_pal("black_green") — black-to-green sentiment scale. */
export const WSJ_BLACK_GREEN_PALETTE: readonly string[] = [
  "#000000",
  "#595959",
  "#59a77f",
  "#008856",
];

/** ggthemes wsj_pal("dem_rep") — Democrat/Republican/Undecided. */
export const WSJ_DEM_REP_PALETTE: readonly string[] = ["#006a8e", "#b1283a", "#a8a6a7"];

/** ggthemes excel_pal(line = FALSE) — the Excel 97 area/fill palette (scale_fill_excel). */
export const EXCEL_FILL_PALETTE: readonly string[] = [
  "#993366",
  "#FFFFCC",
  "#CCFFFF",
  "#660066",
  "#FF8080",
  "#0066CC",
  "#CCCCFF",
];

/**
 * ggthemes excel_new_pal("Office Theme") — current Office's six accents.
 * ggthemes ships 50 named Office color themes; only the default is
 * registered (documented subset, as with canva).
 */
export const EXCEL_NEW_PALETTE: readonly string[] = [
  "#4472C4",
  "#ED7D31",
  "#A5A5A5",
  "#FFC000",
  "#5B9BD5",
  "#70AD47",
];
/** Named categorical schemes accepted by the portable spec. */
export const CATEGORICAL_SCHEMES = {
  observable10: CATEGORICAL_PALETTE_10,
  ipsum: IPSUM_PALETTE,
  flexoki: FLEXOKI_PALETTE,
  tableau10: TABLEAU10_PALETTE,
  colorblind: COLORBLIND_PALETTE,
  economist: ECONOMIST_PALETTE,
  solarized: SOLARIZED_PALETTE,
  few: FEW_PALETTE,
  few_light: FEW_LIGHT_PALETTE,
  few_dark: FEW_DARK_PALETTE,
  fivethirtyeight: FIVETHIRTYEIGHT_PALETTE,
  ptol: PTOL_PALETTE,
  canva: CANVA_PALETTE,
  wsj: WSJ_PALETTE,
  wsj_rgby: WSJ_RGBY_PALETTE,
  wsj_red_green: WSJ_RED_GREEN_PALETTE,
  wsj_black_green: WSJ_BLACK_GREEN_PALETTE,
  wsj_dem_rep: WSJ_DEM_REP_PALETTE,
  calc: CALC_PALETTE,
  excel: EXCEL_PALETTE,
  excel_fill: EXCEL_FILL_PALETTE,
  excel_new: EXCEL_NEW_PALETTE,
  tableau20: TABLEAU20_PALETTE,
  tableau_colorblind: TABLEAU_COLORBLIND_PALETTE,
  tableau_seattle_grays: TABLEAU_SEATTLE_GRAYS_PALETTE,
  tableau_traffic: TABLEAU_TRAFFIC_PALETTE,
  tableau_miller_stone: TABLEAU_MILLER_STONE_PALETTE,
  tableau_superfishel_stone: TABLEAU_SUPERFISHEL_STONE_PALETTE,
  tableau_nuriel_stone: TABLEAU_NURIEL_STONE_PALETTE,
  tableau_jewel_bright: TABLEAU_JEWEL_BRIGHT_PALETTE,
  tableau_summer: TABLEAU_SUMMER_PALETTE,
  tableau_winter: TABLEAU_WINTER_PALETTE,
  tableau_green_orange_teal: TABLEAU_GREEN_ORANGE_TEAL_PALETTE,
  tableau_red_blue_brown: TABLEAU_RED_BLUE_BROWN_PALETTE,
  tableau_purple_pink_gray: TABLEAU_PURPLE_PINK_GRAY_PALETTE,
  tableau_hue_circle: TABLEAU_HUE_CIRCLE_PALETTE,
  ...COLORBREWER_QUALITATIVE,
  hue: HUE_PALETTE_10,
  grey: GREY_PALETTE_10,
  gray: GREY_PALETTE_10,
} as const satisfies Readonly<Record<string, readonly string[]>>;
