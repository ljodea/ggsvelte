/**
 * Crameri multi-sequential ramp fixtures — 11-stop samples
 * from Scientific Colour Maps v8.0.1 (Zenodo DOI 10.5281/zenodo.1243862).
 * Data only: never imports bun:test.
 */
export const MULTISEQUENTIAL_RAMPS: Readonly<Record<string, readonly string[]>> = {
  bukavu: [
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
  ],
  fes: [
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
  ],
  oleron: [
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
  ],
} as const;
