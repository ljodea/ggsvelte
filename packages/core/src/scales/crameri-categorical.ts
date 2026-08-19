/**
 * Fabio Crameri Scientific colour maps — categorical (*S) 10-colour prefixes.
 *
 * Source: Crameri, F. (2018/2023). Scientific colour maps.
 * Zenodo. https://doi.org/10.5281/zenodo.1243862 (MIT License).
 *
 * Each table is the first 10 colours of the official 100-colour *S file
 * (v8.0.1). That prefix is the greedy max-contrast 10-class set. Do not
 * even-sample the continuous ramp. Public consumers resolve via
 * {@link crameriCategoricalStops}.
 */
/** Scientific colour map "actonS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_ACTONS_PALETTE: readonly string[] = [
  "#2e214d",
  "#e6e6f0",
  "#c36d9a",
  "#d4a6c4",
  "#775a86",
  "#503e6a",
  "#d58cb1",
  "#dac5d9",
  "#9e6592",
  "#dfd5e4",
];
/** Scientific colour map "bamakoS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_BAMAKOS_PALETTE: readonly string[] = [
  "#00404c",
  "#ffe599",
  "#607d15",
  "#b9a525",
  "#2b5a34",
  "#e3c961",
  "#154c41",
  "#878e03",
  "#426a26",
  "#0b4647",
];
/** Scientific colour map "batlowS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_BATLOWS_PALETTE: readonly string[] = [
  "#011959",
  "#faccfa",
  "#828231",
  "#226061",
  "#f19d6b",
  "#4d734d",
  "#114360",
  "#fdb4b4",
  "#c09036",
  "#175262",
];
/** Scientific colour map "batlowWS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_BATLOWWS_PALETTE: readonly string[] = [
  "#fffefe",
  "#011959",
  "#7c8738",
  "#e7ab84",
  "#205f61",
  "#bd9d44",
  "#fed1cd",
  "#114360",
  "#497451",
  "#0d315d",
];
/** Scientific colour map "batlowKS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_BATLOWKS_PALETTE: readonly string[] = [
  "#04050a",
  "#fdc0d6",
  "#787c41",
  "#39555f",
  "#e5a160",
  "#1b2f45",
  "#af933a",
  "#546955",
  "#faae9a",
  "#111a27",
];
/** Scientific colour map "bilbaoS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_BILBAOS_PALETTE: readonly string[] = [
  "#f8f8f8",
  "#4d0001",
  "#a98565",
  "#c0baa2",
  "#924946",
  "#a16959",
  "#b3a279",
  "#722625",
  "#d3d2cd",
  "#9c5a51",
];
/** Scientific colour map "budaS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_BUDAS_PALETTE: readonly string[] = [
  "#b301b3",
  "#ffff66",
  "#cd857e",
  "#bc4e90",
  "#dcbe70",
  "#d4a177",
  "#b32f9c",
  "#c56a87",
  "#e4dc69",
  "#b73f95",
];
/** Scientific colour map "davosS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_DAVOSS_PALETTE: readonly string[] = [
  "#00054a",
  "#fdfdf4",
  "#688b94",
  "#2d5895",
  "#b2c08f",
  "#4b769d",
  "#133075",
  "#87a089",
  "#e8ebc0",
  "#081c61",
];
/** Scientific colour map "devonS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_DEVONS_PALETTE: readonly string[] = [
  "#2c1a4c",
  "#f8f8fe",
  "#778bda",
  "#28568c",
  "#c6c1f3",
  "#aba6ed",
  "#29376a",
  "#3e6fb8",
  "#dfdcf8",
  "#3063a2",
];
/** Scientific colour map "glasgowS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_GLASGOWS_PALETTE: readonly string[] = [
  "#361338",
  "#dbd3ff",
  "#6d702d",
  "#702d06",
  "#69a3a5",
  "#521b20",
  "#a0bbd3",
  "#745101",
  "#638a6a",
  "#84b0be",
];
/** Scientific colour map "grayCS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_GRAYCS_PALETTE: readonly string[] = [
  "#f9f9f9",
  "#060606",
  "#767676",
  "#b6b6b6",
  "#3c3c3c",
  "#595959",
  "#969696",
  "#232323",
  "#d7d7d7",
  "#676767",
];
/** Scientific colour map "hawaiiS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_HAWAIIS_PALETTE: readonly string[] = [
  "#8c0273",
  "#b3f2fd",
  "#9c951c",
  "#6cd48c",
  "#974e3e",
  "#66e8d3",
  "#8abc48",
  "#922e55",
  "#9b6f28",
  "#953e49",
];
/** Scientific colour map "imolaS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_IMOLAS_PALETTE: readonly string[] = [
  "#1a33b3",
  "#ffff66",
  "#53857f",
  "#91c36f",
  "#305e9d",
  "#2549a8",
  "#70a377",
  "#bde667",
  "#3e708f",
  "#ddf466",
];
/** Scientific colour map "lajollaS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_LAJOLLAS_PALETTE: readonly string[] = [
  "#ffffcc",
  "#1a1a01",
  "#de764f",
  "#7f3b34",
  "#f2c360",
  "#492a1b",
  "#b84f47",
  "#fbe992",
  "#e99b53",
  "#633328",
];
/** Scientific colour map "lapazS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_LAPAZS_PALETTE: readonly string[] = [
  "#1a0c64",
  "#fef2f3",
  "#5c8ca3",
  "#2d5393",
  "#b5ad96",
  "#3d71a0",
  "#24327e",
  "#869e9b",
  "#ebcfbb",
  "#d2bba2",
];
/** Scientific colour map "lipariS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_LIPARIS_PALETTE: readonly string[] = [
  "#031326",
  "#fdf5da",
  "#a36267",
  "#e99973",
  "#525b7a",
  "#d86e5e",
  "#183e61",
  "#e7c398",
  "#775f73",
  "#f0dbb7",
];
/** Scientific colour map "naviaS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_NAVIAS_PALETTE: readonly string[] = [
  "#031327",
  "#fcf4d9",
  "#418a80",
  "#1b608f",
  "#87c269",
  "#073966",
  "#d1e39f",
  "#2f798b",
  "#59a072",
  "#eaedbf",
];
/** Scientific colour map "nuukS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_NUUKS_PALETTE: readonly string[] = [
  "#05598c",
  "#fefeb2",
  "#a1a698",
  "#537785",
  "#c3c285",
  "#2d6483",
  "#dcdb8a",
  "#7d8f91",
  "#b5b591",
  "#eeee9c",
];
/** Scientific colour map "osloS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_OSLOS_PALETTE: readonly string[] = [
  "#030609",
  "#f9f9f9",
  "#4e7abb",
  "#9fafc9",
  "#163a5d",
  "#7a98ca",
  "#c9cdd4",
  "#26578c",
  "#0e1f31",
  "#658ac7",
];
/** Scientific colour map "tokyoS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_TOKYOS_PALETTE: readonly string[] = [
  "#1a0e34",
  "#fefed8",
  "#908786",
  "#76466c",
  "#a1c699",
  "#95a58e",
  "#89697d",
  "#4b2350",
  "#d0efb8",
  "#92968a",
];
/** Scientific colour map "turkuS" — 10-class categorical prefix, Zenodo 8.0.1. */
const CRAMERI_TURKUS_PALETTE: readonly string[] = [
  "#070707",
  "#ffe6e6",
  "#948d5b",
  "#e5aa90",
  "#4d4c3b",
  "#6d6c4a",
  "#c3a374",
  "#fbc3bd",
  "#2b2b26",
  "#3c3c32",
];
const CRAMERI_CATEGORICAL = {
  actonS: CRAMERI_ACTONS_PALETTE,
  bamakoS: CRAMERI_BAMAKOS_PALETTE,
  batlowS: CRAMERI_BATLOWS_PALETTE,
  batlowWS: CRAMERI_BATLOWWS_PALETTE,
  batlowKS: CRAMERI_BATLOWKS_PALETTE,
  bilbaoS: CRAMERI_BILBAOS_PALETTE,
  budaS: CRAMERI_BUDAS_PALETTE,
  davosS: CRAMERI_DAVOSS_PALETTE,
  devonS: CRAMERI_DEVONS_PALETTE,
  glasgowS: CRAMERI_GLASGOWS_PALETTE,
  grayCS: CRAMERI_GRAYCS_PALETTE,
  hawaiiS: CRAMERI_HAWAIIS_PALETTE,
  imolaS: CRAMERI_IMOLAS_PALETTE,
  lajollaS: CRAMERI_LAJOLLAS_PALETTE,
  lapazS: CRAMERI_LAPAZS_PALETTE,
  lipariS: CRAMERI_LIPARIS_PALETTE,
  naviaS: CRAMERI_NAVIAS_PALETTE,
  nuukS: CRAMERI_NUUKS_PALETTE,
  osloS: CRAMERI_OSLOS_PALETTE,
  tokyoS: CRAMERI_TOKYOS_PALETTE,
  turkuS: CRAMERI_TURKUS_PALETTE,
} as const;

/** Official v8.0.1 *S tables keyed by portable scheme name. */
export const CRAMERI_CATEGORICAL_SCHEMES = CRAMERI_CATEGORICAL;

type CrameriCategoricalName = keyof typeof CRAMERI_CATEGORICAL;

function isCrameriCategoricalName(name: string): name is CrameriCategoricalName {
  return Object.hasOwn(CRAMERI_CATEGORICAL, name);
}

/** Resolve a Crameri categorical *S palette, or undefined. */
export function crameriCategoricalStops(name: string): readonly string[] | undefined {
  return isCrameriCategoricalName(name) ? CRAMERI_CATEGORICAL[name] : undefined;
}

/** Official v8.0.1 *S names that ship a 10-class categorical table. */
export const CRAMERI_CATEGORICAL_SCHEME_NAMES = [
  "actonS",
  "bamakoS",
  "batlowS",
  "batlowWS",
  "batlowKS",
  "bilbaoS",
  "budaS",
  "davosS",
  "devonS",
  "glasgowS",
  "grayCS",
  "hawaiiS",
  "imolaS",
  "lajollaS",
  "lapazS",
  "lipariS",
  "naviaS",
  "nuukS",
  "osloS",
  "tokyoS",
  "turkuS",
] as const;
