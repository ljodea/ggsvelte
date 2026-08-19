/**
 * Fabio Crameri Scientific colour maps (continuous suite, v8.0.1).
 *
 * Source: Crameri, F. (2018/2023). Scientific colour maps.
 * Zenodo. https://doi.org/10.5281/zenodo.1243862 (MIT License).
 *
 * Each ramp is 11 stops sampled evenly from the official 256-row RGB
 * table (0–1 floats → #rrggbb). Piecewise-linear sRGB interpolation
 * (rampColor) fills between stops. Cyclic (*O) maps are included; they
 * need wrap out-of-bounds and an explicit period. Categorical (*S) maps
 * live in crameri-categorical.ts.
 *
 * Pure data — resolution falls through here from
 * `resolveSequentialPipelineRange` / `resolveOrdinalPaletteStops` after the
 * viridis-family and ColorBrewer tables. Named tables stay
 * module-private (knip): public consumers resolve via {@link crameriRampStops}.
 */

/** Scientific colour map "acton" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_ACTON_RAMP: readonly string[] = [
  "#260d40",
  "#3c2c5c",
  "#4f4775",
  "#665e8a",
  "#85648e",
  "#a86690",
  "#ca7199",
  "#d890b3",
  "#e2b2cf",
  "#e9d1e7",
  "#f0eafa",
];

/** Scientific colour map "bamako" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_BAMAKO_RAMP: readonly string[] = [
  "#003b47",
  "#0d4340",
  "#1b4c37",
  "#2e582b",
  "#47681c",
  "#637a0a",
  "#818800",
  "#a2930d",
  "#c6ae39",
  "#e5cb75",
  "#ffe5ad",
];

/** Scientific colour map "batlow" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_BATLOW_RAMP: readonly string[] = [
  "#011959",
  "#103d5f",
  "#185562",
  "#30685c",
  "#577647",
  "#828231",
  "#b38e2f",
  "#e09651",
  "#fba689",
  "#fdb9c2",
  "#faccfa",
];

/** Scientific colour map "batlowW" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_BATLOWW_RAMP: readonly string[] = [
  "#011959",
  "#103d5f",
  "#175462",
  "#2d685e",
  "#53784c",
  "#7e8737",
  "#b1993a",
  "#daa66b",
  "#f3b49e",
  "#ffdddb",
  "#fffefe",
];

/** Scientific colour map "batlowK" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_BATLOWK_RAMP: readonly string[] = [
  "#04050a",
  "#18293d",
  "#304d5d",
  "#47605c",
  "#61704d",
  "#86833c",
  "#b7953c",
  "#e4a15f",
  "#f9ac92",
  "#fdbbc5",
  "#faccfa",
];

/** Scientific colour map "bilbao" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_BILBAO_RAMP: readonly string[] = [
  "#4c0001",
  "#712227",
  "#8e3f46",
  "#9e5a55",
  "#a46f5a",
  "#a9825e",
  "#ae9663",
  "#b9ae80",
  "#c4c0ac",
  "#d6d5d3",
  "#ffffff",
];

/** Scientific colour map "buda" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_BUDA_RAMP: readonly string[] = [
  "#b301b3",
  "#b3289f",
  "#b84294",
  "#bf598c",
  "#c76f85",
  "#cd857e",
  "#d39b79",
  "#d8b173",
  "#dec96d",
  "#e7e268",
  "#ffff66",
];

/** Scientific colour map "davos" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_DAVOS_RAMP: readonly string[] = [
  "#00054a",
  "#102a6f",
  "#234a8c",
  "#3a679b",
  "#547d9c",
  "#6c8e93",
  "#849e89",
  "#a4b68a",
  "#d4dba8",
  "#f5f5d7",
  "#fefefe",
];

/** Scientific colour map "devon" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_DEVON_RAMP: readonly string[] = [
  "#2c1a4c",
  "#293265",
  "#274a7e",
  "#2f62a0",
  "#4c77c4",
  "#7e8fdd",
  "#a8a5ec",
  "#c0baf2",
  "#d5d1f6",
  "#eae8fb",
  "#ffffff",
];

/** Scientific colour map "glasgow" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_GLASGOW_RAMP: readonly string[] = [
  "#361338",
  "#4d1924",
  "#652211",
  "#743b01",
  "#735704",
  "#6d702d",
  "#65845d",
  "#60988c",
  "#7eaeb9",
  "#abc0dc",
  "#dbd3ff",
];

/** Scientific colour map "grayC" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_GRAYC_RAMP: readonly string[] = [
  "#000000",
  "#212121",
  "#383838",
  "#4e4e4e",
  "#636363",
  "#777777",
  "#8b8b8b",
  "#a2a2a2",
  "#bdbdbd",
  "#dcdcdc",
  "#ffffff",
];

/** Scientific colour map "hawaii" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_HAWAII_RAMP: readonly string[] = [
  "#8c0273",
  "#91285a",
  "#954147",
  "#985936",
  "#9c7524",
  "#9c961c",
  "#8fb63c",
  "#78cb70",
  "#62dca9",
  "#71ece0",
  "#b3f2fd",
];

/** Scientific colour map "imola" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_IMOLA_RAMP: readonly string[] = [
  "#1a33b3",
  "#2345aa",
  "#2c55a1",
  "#356598",
  "#42748b",
  "#54867f",
  "#6a9d78",
  "#83b672",
  "#9fd26b",
  "#caec67",
  "#ffff66",
];

/** Scientific colour map "lajolla" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_LAJOLLA_RAMP: readonly string[] = [
  "#191900",
  "#31220e",
  "#512d1e",
  "#7d3b35",
  "#b34947",
  "#d9604e",
  "#e38050",
  "#e99d53",
  "#f0bd57",
  "#f9e384",
  "#fffecb",
];

/** Scientific colour map "lapaz" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_LAPAZ_RAMP: readonly string[] = [
  "#1a0c64",
  "#222b79",
  "#28468b",
  "#315e99",
  "#4277a2",
  "#5c8ca3",
  "#7c9b9e",
  "#9fa696",
  "#cab79d",
  "#f2d7c6",
  "#fef2f3",
];

/** Scientific colour map "lipari" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_LIPARI_RAMP: readonly string[] = [
  "#031326",
  "#103557",
  "#3c5478",
  "#615e78",
  "#806070",
  "#a56267",
  "#cf695e",
  "#e98768",
  "#e6aa7f",
  "#eacda5",
  "#fdf5da",
];

/** Scientific colour map "navia" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_NAVIA_RAMP: readonly string[] = [
  "#031327",
  "#06315a",
  "#105185",
  "#236c91",
  "#327c89",
  "#418a80",
  "#549b75",
  "#70b369",
  "#a7d278",
  "#dde7ae",
  "#fcf4d9",
];

/** Scientific colour map "naviaW" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_NAVIAW_RAMP: readonly string[] = [
  "#041427",
  "#08345c",
  "#165584",
  "#29708f",
  "#388188",
  "#4a927f",
  "#62a774",
  "#8cc574",
  "#cbe6a3",
  "#eff6db",
  "#fefefd",
];

/** Scientific colour map "nuuk" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_NUUK_RAMP: readonly string[] = [
  "#05598c",
  "#276184",
  "#436e82",
  "#638089",
  "#859493",
  "#a1a698",
  "#b2b293",
  "#bdbd8a",
  "#caca83",
  "#e4e391",
  "#fefeb2",
];

/** Scientific colour map "oslo" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_OSLO_RAMP: readonly string[] = [
  "#010101",
  "#0d1927",
  "#122d48",
  "#1a446d",
  "#2c5d96",
  "#507bbc",
  "#7494c9",
  "#92a6c9",
  "#b2bccc",
  "#d8dade",
  "#ffffff",
];

/** Scientific colour map "tokyo" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_TOKYO_RAMP: readonly string[] = [
  "#1c0e34",
  "#481e43",
  "#653a4d",
  "#6e5151",
  "#716152",
  "#747053",
  "#788555",
  "#7fa35c",
  "#95cb78",
  "#c7f0b2",
  "#effcdd",
];

/** Scientific colour map "turku" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_TURKU_RAMP: readonly string[] = [
  "#000000",
  "#22221f",
  "#3c3c32",
  "#565640",
  "#71704c",
  "#938c5b",
  "#b9a06e",
  "#d8a782",
  "#efb1a1",
  "#fdcbc7",
  "#ffe6e6",
];

/** Scientific colour map "bam" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_BAM_RAMP: readonly string[] = [
  "#65024b",
  "#9b3881",
  "#c164a9",
  "#dd9acb",
  "#f0d1e8",
  "#f6f1f0",
  "#e2edd1",
  "#adcd89",
  "#709e4b",
  "#407626",
  "#0d4c00",
];

/** Scientific colour map "berlin" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_BERLIN_RAMP: readonly string[] = [
  "#9eb0ff",
  "#60a5df",
  "#3280a6",
  "#20526a",
  "#112732",
  "#190c09",
  "#371000",
  "#5f1f0a",
  "#964a36",
  "#ca7b71",
  "#ffadad",
];

/** Scientific colour map "broc" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_BROC_RAMP: readonly string[] = [
  "#2c1a4c",
  "#284174",
  "#3f6b99",
  "#7697b7",
  "#b3c5d7",
  "#ebeeec",
  "#dcdbb8",
  "#b6b67c",
  "#81814c",
  "#505023",
  "#262600",
];

/** Scientific colour map "cork" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_CORK_RAMP: readonly string[] = [
  "#2c194c",
  "#284275",
  "#3d6b98",
  "#6f92b3",
  "#adc1d4",
  "#e6edec",
  "#b7cfb7",
  "#7ba77a",
  "#438142",
  "#195615",
  "#0f2903",
];

/** Scientific colour map "lisbon" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_LISBON_RAMP: readonly string[] = [
  "#e6e5ff",
  "#a0b3d6",
  "#6083ae",
  "#2a537d",
  "#132a42",
  "#171919",
  "#383522",
  "#66603d",
  "#9a9160",
  "#cfc998",
  "#ffffd9",
];

/** Scientific colour map "managua" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_MANAGUA_RAMP: readonly string[] = [
  "#ffcf67",
  "#df9d56",
  "#c17449",
  "#a0513e",
  "#773339",
  "#572949",
  "#4c3d73",
  "#5161a1",
  "#5f89c3",
  "#6fb6e2",
  "#81e7ff",
];

/** Scientific colour map "roma" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_ROMA_RAMP: readonly string[] = [
  "#7e1700",
  "#984e14",
  "#ac7726",
  "#c1a343",
  "#d2d484",
  "#c0eac3",
  "#89dad7",
  "#4db3cf",
  "#2d88be",
  "#1e5fac",
  "#033198",
];

/** Scientific colour map "tofino" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_TOFINO_RAMP: readonly string[] = [
  "#ded9ff",
  "#98a8e1",
  "#5777ba",
  "#304a7b",
  "#19253d",
  "#0d1613",
  "#18321a",
  "#2b5b2f",
  "#4a8d4b",
  "#91be74",
  "#dbe69b",
];

/** Scientific colour map "vanimo" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_VANIMO_RAMP: readonly string[] = [
  "#ffcdfd",
  "#d786c8",
  "#ad539a",
  "#742e64",
  "#33172c",
  "#1a1513",
  "#232c14",
  "#40581f",
  "#62872f",
  "#8abc53",
  "#befda5",
];

/** Scientific colour map "vik" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_VIK_RAMP: readonly string[] = [
  "#001261",
  "#023a7b",
  "#116496",
  "#5496b7",
  "#a7c9da",
  "#ece5e0",
  "#e1b8a0",
  "#cd8961",
  "#b75a26",
  "#852206",
  "#590008",
];

/** Scientific colour map "bukavu" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_BUKAVU_RAMP: readonly string[] = [
  "#1a3333",
  "#214e71",
  "#2f7ab6",
  "#56a6c9",
  "#8ad1cf",
  "#014026",
  "#326513",
  "#7d7732",
  "#b68f60",
  "#d6c8b4",
  "#ededfc",
];

/** Scientific colour map "fes" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_FES_RAMP: readonly string[] = [
  "#0d0d0d",
  "#3c3c3c",
  "#646464",
  "#888888",
  "#b7b7b7",
  "#024026",
  "#4d5923",
  "#88682e",
  "#be905f",
  "#d6c8b4",
  "#ededfc",
];

/** Scientific colour map "oleron" — 11 stops, Zenodo 8.0.1. */
const CRAMERI_OLERON_RAMP: readonly string[] = [
  "#1a2659",
  "#424f82",
  "#6c79ac",
  "#99a6d9",
  "#c4d1f6",
  "#1a4c00",
  "#535e02",
  "#8c7c31",
  "#c5a46c",
  "#f3d4ab",
  "#fdfde6",
];

/** Scientific colour map "bamO" — 11 stops, Zenodo 8.0.1 (cyclic). */
const CRAMERI_BAMO_RAMP: readonly string[] = [
  "#4f3043",
  "#834675",
  "#ae6d9e",
  "#d19ec2",
  "#d9c5cb",
  "#cecdbb",
  "#a2b185",
  "#78835b",
  "#5b5c44",
  "#4b403b",
  "#4e3042",
];

/** Scientific colour map "brocO" — 11 stops, Zenodo 8.0.1 (cyclic). */
const CRAMERI_BROCO_RAMP: readonly string[] = [
  "#372f38",
  "#373f60",
  "#4c6790",
  "#7894b4",
  "#adbecd",
  "#cfd3c5",
  "#bcbc92",
  "#8f8f5c",
  "#615f36",
  "#423c29",
  "#372f37",
];

/** Scientific colour map "corkO" — 11 stops, Zenodo 8.0.1 (cyclic). */
const CRAMERI_CORKO_RAMP: readonly string[] = [
  "#3f3e3a",
  "#3e425a",
  "#4d6389",
  "#738fb0",
  "#a1b8c7",
  "#afcbbc",
  "#90ba91",
  "#66955e",
  "#4a6934",
  "#424c2d",
  "#3f3e3a",
];

/** Scientific colour map "romaO" — 11 stops, Zenodo 8.0.1 (cyclic). */
const CRAMERI_ROMAO_RAMP: readonly string[] = [
  "#733957",
  "#863f38",
  "#9c5d2b",
  "#b88e3b",
  "#d3c876",
  "#cbe1b3",
  "#9bd4cd",
  "#65adca",
  "#4e7cb2",
  "#5e4f85",
  "#723959",
];

/** Scientific colour map "vikO" — 11 stops, Zenodo 8.0.1 (cyclic). */
const CRAMERI_VIKO_RAMP: readonly string[] = [
  "#4f1a3d",
  "#3c3263",
  "#355c8d",
  "#5e8db1",
  "#a4b9c8",
  "#d5beb3",
  "#d59c7d",
  "#ba6a45",
  "#8a3320",
  "#651725",
  "#50193c",
];

/** Named Crameri continuous ramps keyed by portable scheme name. */
const CRAMERI_RAMPS = {
  acton: CRAMERI_ACTON_RAMP,
  bamako: CRAMERI_BAMAKO_RAMP,
  batlow: CRAMERI_BATLOW_RAMP,
  batlowW: CRAMERI_BATLOWW_RAMP,
  batlowK: CRAMERI_BATLOWK_RAMP,
  bilbao: CRAMERI_BILBAO_RAMP,
  buda: CRAMERI_BUDA_RAMP,
  davos: CRAMERI_DAVOS_RAMP,
  devon: CRAMERI_DEVON_RAMP,
  glasgow: CRAMERI_GLASGOW_RAMP,
  grayC: CRAMERI_GRAYC_RAMP,
  hawaii: CRAMERI_HAWAII_RAMP,
  imola: CRAMERI_IMOLA_RAMP,
  lajolla: CRAMERI_LAJOLLA_RAMP,
  lapaz: CRAMERI_LAPAZ_RAMP,
  lipari: CRAMERI_LIPARI_RAMP,
  navia: CRAMERI_NAVIA_RAMP,
  naviaW: CRAMERI_NAVIAW_RAMP,
  nuuk: CRAMERI_NUUK_RAMP,
  oslo: CRAMERI_OSLO_RAMP,
  tokyo: CRAMERI_TOKYO_RAMP,
  turku: CRAMERI_TURKU_RAMP,
  bam: CRAMERI_BAM_RAMP,
  berlin: CRAMERI_BERLIN_RAMP,
  broc: CRAMERI_BROC_RAMP,
  cork: CRAMERI_CORK_RAMP,
  lisbon: CRAMERI_LISBON_RAMP,
  managua: CRAMERI_MANAGUA_RAMP,
  roma: CRAMERI_ROMA_RAMP,
  tofino: CRAMERI_TOFINO_RAMP,
  vanimo: CRAMERI_VANIMO_RAMP,
  vik: CRAMERI_VIK_RAMP,
  bukavu: CRAMERI_BUKAVU_RAMP,
  fes: CRAMERI_FES_RAMP,
  oleron: CRAMERI_OLERON_RAMP,
  bamO: CRAMERI_BAMO_RAMP,
  brocO: CRAMERI_BROCO_RAMP,
  corkO: CRAMERI_CORKO_RAMP,
  romaO: CRAMERI_ROMAO_RAMP,
  vikO: CRAMERI_VIKO_RAMP,
} as const;

type CrameriSchemeName = keyof typeof CRAMERI_RAMPS;

function isCrameriSchemeName(name: string): name is CrameriSchemeName {
  return Object.hasOwn(CRAMERI_RAMPS, name);
}

/** Resolve a Crameri continuous ramp by portable scheme name, or undefined. */
export function crameriRampStops(name: string): readonly string[] | undefined {
  return isCrameriSchemeName(name) ? CRAMERI_RAMPS[name] : undefined;
}
