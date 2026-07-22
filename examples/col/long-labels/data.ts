/**
 * Narrow-width band-axis VR specimen (#406): long Spanish multi-word labels
 * plus a long German single-token category so wrap and rotate paths both fire
 * at ~480px chart width.
 */
export const filings = [
  { category: "Resolución", count: 9000 },
  { category: "Corrección (errores o erratas)", count: 3200 },
  { category: "Sentencia", count: 2800 },
  { category: "Anlageverwaltungsgesellschaft", count: 2500 },
  { category: "Orden", count: 900 },
] as const;
