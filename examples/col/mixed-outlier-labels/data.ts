/**
 * #634 VR specimen: mixed short categories + one four-token multi-word outlier
 * at a normal desktop panel width (640px). Auto layout must wrap (not −90° +
 * truncate). Companion to examples/col/long-labels (narrow 480px escalate path).
 */
export const filings = [
  { category: "Real Decreto", count: 7800 },
  { category: "Orden", count: 7000 },
  { category: "Ley", count: 6711 },
  { category: "Resolución", count: 3000 },
  { category: "Corrección (errores o erratas)", count: 2200 },
  { category: "Sentencia", count: 1800 },
  { category: "Directiva", count: 1200 },
  { category: "Reglamento", count: 1000 },
] as const;
