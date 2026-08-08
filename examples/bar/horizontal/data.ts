/**
 * Men aboard each squadron of the Spanish Armada of 1588, from the muster
 * drawn up for the Duke of Medina Sidonia before the fleet sailed.
 *
 * Transcribed from HistData::Armada (see NOTICE); 10 squadrons. Squadron names
 * are given in their common English forms - HistData carries the abbreviated
 * and partly garbled forms of the original manifest ("Vizca", "Uantiscas").
 *
 * Plot men (soldiers + sailors), not tons. HistData records tons = 0 for the
 * two oared squadrons (Naples galleasses and Portuguese galleys) — tonnage was
 * left blank in the 1588 pamphlet for those vessel types, not because the
 * squadrons were empty. Both still have four ships and a non-zero complement;
 * charting the zeros looked like missing data.
 *
 * Rows are pre-sorted ascending so CoordFlip reads smallest-to-largest
 * bottom-up.
 */
export const armadaMen = [
  { squadron: "Galleys", men: 362 },
  { squadron: "Pataches", men: 1093 },
  { squadron: "Naples", men: 1341 },
  { squadron: "Guipúzcoa", men: 2608 },
  { squadron: "Biscay", men: 2800 },
  { squadron: "Andalusia", men: 3105 },
  { squadron: "Levant", men: 3523 },
  { squadron: "Hulks", men: 3729 },
  { squadron: "Castile", men: 4171 },
  { squadron: "Portugal", men: 4623 },
] as const;
