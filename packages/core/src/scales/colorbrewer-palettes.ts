/**
 * ColorBrewer palettes (Cynthia Brewer; public domain color specifications).
 * Max-n hex tables for clean-room ggplot2 scale_*_brewer / distiller / fermenter (#825).
 * Qualitative sets train ordinal schemes; sequential/diverging tables act as ramps.
 */

/** Qualitative (max-n) */
const CB_SET1 = [
  "#e41a1c",
  "#377eb8",
  "#4daf4a",
  "#984ea3",
  "#ff7f00",
  "#ffff33",
  "#a65628",
  "#f781bf",
  "#999999",
] as const;
export const CB_SET2 = [
  "#66c2a5",
  "#fc8d62",
  "#8da0cb",
  "#e78ac3",
  "#a6d854",
  "#ffd92f",
  "#e5c494",
  "#b3b3b3",
] as const;
const CB_SET3 = [
  "#8dd3c7",
  "#ffffb3",
  "#bebada",
  "#fb8072",
  "#80b1d3",
  "#fdb462",
  "#b3de69",
  "#fccde5",
  "#d9d9d9",
  "#bc80bd",
  "#ccebc5",
  "#ffed6f",
] as const;
const CB_DARK2 = [
  "#1b9e77",
  "#d95f02",
  "#7570b3",
  "#e7298a",
  "#66a61e",
  "#e6ab02",
  "#a6761d",
  "#666666",
] as const;
const CB_PAIRED = [
  "#a6cee3",
  "#1f78b4",
  "#b2df8a",
  "#33a02c",
  "#fb9a99",
  "#e31a1c",
  "#fdbf6f",
  "#ff7f00",
  "#cab2d6",
  "#6a3d9a",
  "#ffff99",
  "#b15928",
] as const;
const CB_ACCENT = [
  "#7fc97f",
  "#beaed4",
  "#fdc086",
  "#ffff99",
  "#386cb0",
  "#f0027f",
  "#bf5b17",
  "#666666",
] as const;

/** Sequential 9-class */
export const CB_BLUES = [
  "#f7fbff",
  "#deebf7",
  "#c6dbef",
  "#9ecae1",
  "#6baed6",
  "#4292c6",
  "#2171b5",
  "#08519c",
  "#08306b",
] as const;
const CB_GREENS = [
  "#f7fcf5",
  "#e5f5e0",
  "#c7e9c0",
  "#a1d99b",
  "#74c476",
  "#41ab5d",
  "#238b45",
  "#006d2c",
  "#00441b",
] as const;
const CB_REDS = [
  "#fff5f0",
  "#fee0d2",
  "#fcbba1",
  "#fc9272",
  "#fb6a4a",
  "#ef3b2c",
  "#cb181d",
  "#a50f15",
  "#67000d",
] as const;
const CB_ORANGES = [
  "#fff5eb",
  "#fee6ce",
  "#fdd0a2",
  "#fdae6b",
  "#fd8d3c",
  "#f16913",
  "#d94801",
  "#a63603",
  "#7f2704",
] as const;
const CB_PURPLES = [
  "#fcfbfd",
  "#efedf5",
  "#dadaeb",
  "#bcbddc",
  "#9e9ac8",
  "#807dba",
  "#6a51a3",
  "#54278f",
  "#3f007d",
] as const;
const CB_GREYS = [
  "#ffffff",
  "#f0f0f0",
  "#d9d9d9",
  "#bdbdbd",
  "#969696",
  "#737373",
  "#525252",
  "#252525",
  "#000000",
] as const;
const CB_YLORRD = [
  "#ffffcc",
  "#ffeda0",
  "#fed976",
  "#feb24c",
  "#fd8d3c",
  "#fc4e2a",
  "#e31a1c",
  "#bd0026",
  "#800026",
] as const;
const CB_YLGNB = [
  "#ffffd9",
  "#edf8b1",
  "#c7e9b4",
  "#7fcdbb",
  "#41b6c4",
  "#1d91c0",
  "#225ea8",
  "#253494",
  "#081d58",
] as const;
const CB_BUPU = [
  "#f7fcfd",
  "#e0ecf4",
  "#bfd3e6",
  "#9ebcda",
  "#8c96c6",
  "#8c6bb1",
  "#88419d",
  "#810f7c",
  "#4d004b",
] as const;

/** Diverging 11-class */
const CB_RDYLBU = [
  "#a50026",
  "#d73027",
  "#f46d43",
  "#fdae61",
  "#fee090",
  "#ffffbf",
  "#e0f3f8",
  "#abd9e9",
  "#74add1",
  "#4575b4",
  "#313695",
] as const;
const CB_RDBU = [
  "#67001f",
  "#b2182b",
  "#d6604d",
  "#f4a582",
  "#fddbc7",
  "#f7f7f7",
  "#d1e5f0",
  "#92c5de",
  "#4393c3",
  "#2166ac",
  "#053061",
] as const;
const CB_BRBG = [
  "#543005",
  "#8c510a",
  "#bf812d",
  "#dfc27d",
  "#f6e8c3",
  "#f5f5f5",
  "#c7eae5",
  "#80cdc1",
  "#35978f",
  "#01665e",
  "#003c30",
] as const;
const CB_SPECTRAL = [
  "#9e0142",
  "#d53e4f",
  "#f46d43",
  "#fdae61",
  "#fee08b",
  "#ffffbf",
  "#e6f598",
  "#abdda4",
  "#66c2a5",
  "#3288bd",
  "#5e4fa2",
] as const;
const CB_PUOR = [
  "#7f3b08",
  "#b35806",
  "#e08214",
  "#fdb863",
  "#fee0b6",
  "#f7f7f7",
  "#d8daeb",
  "#b2abd2",
  "#8073ac",
  "#542788",
  "#2d004b",
] as const;

/** Qualitative schemes for ordinal/brewer. */
export const COLORBREWER_QUALITATIVE = {
  Set1: CB_SET1,
  Set2: CB_SET2,
  Set3: CB_SET3,
  Dark2: CB_DARK2,
  Paired: CB_PAIRED,
  Accent: CB_ACCENT,
} as const satisfies Readonly<Record<string, readonly string[]>>;

/** Sequential + diverging ramps for distiller/fermenter (and ordinal if chosen). */
const COLORBREWER_CONTINUOUS = {
  Blues: CB_BLUES,
  Greens: CB_GREENS,
  Reds: CB_REDS,
  Oranges: CB_ORANGES,
  Purples: CB_PURPLES,
  Greys: CB_GREYS,
  YlOrRd: CB_YLORRD,
  YlGnBu: CB_YLGNB,
  BuPu: CB_BUPU,
  RdYlBu: CB_RDYLBU,
  RdBu: CB_RDBU,
  BrBG: CB_BRBG,
  Spectral: CB_SPECTRAL,
  PuOr: CB_PUOR,
} as const satisfies Readonly<Record<string, readonly string[]>>;

export function colorBrewerStops(name: string): readonly string[] | undefined {
  if (Object.hasOwn(COLORBREWER_QUALITATIVE, name)) {
    return COLORBREWER_QUALITATIVE[name as keyof typeof COLORBREWER_QUALITATIVE];
  }
  if (Object.hasOwn(COLORBREWER_CONTINUOUS, name)) {
    return COLORBREWER_CONTINUOUS[name as keyof typeof COLORBREWER_CONTINUOUS];
  }
  return undefined;
}
