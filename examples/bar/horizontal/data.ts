/**
 * Total tonnage of each squadron of the Spanish Armada of 1588, by squadron, from the muster drawn up for the
 * Duke of Medina Sidonia before the fleet sailed.
 *
 * Transcribed from HistData::Armada (see NOTICE); 10 squadrons. Squadron names
 * are given in their common English forms - HistData carries the abbreviated
 * and partly garbled forms of the original manifest ("Vizca", "Uantiscas").
 */
export const armadaTonnage = [
  { squadron: "Naples", tons: 0 },
  { squadron: "Galleys", tons: 0 },
  { squadron: "Pataches", tons: 1221 },
  { squadron: "Biscay", tons: 6567 },
  { squadron: "Guipúzcoa", tons: 6991 },
  { squadron: "Levant", tons: 7705 },
  { squadron: "Portugal", tons: 7737 },
  { squadron: "Castile", tons: 8714 },
  { squadron: "Andalusia", tons: 8762 },
  { squadron: "Hulks", tons: 10271 },
] as const;
