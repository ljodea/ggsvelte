/**
 * Soldiers and sailors aboard each squadron of the Spanish Armada of 1588, by squadron, from the muster drawn up for the
 * Duke of Medina Sidonia before the fleet sailed.
 *
 * Transcribed from HistData::Armada (see NOTICE); 10 squadrons. Squadron names
 * are given in their common English forms - HistData carries the abbreviated
 * and partly garbled forms of the original manifest ("Vizca", "Uantiscas").
 */
//
// The composition is the point: Spain's plan depended on boarding and England's
// on gunnery, so the squadrons carrying the most soldiers per sailor were the
// ones least able to fight the battle that actually happened.
export const armadaCrews = [
  { squadron: "Portugal", role: "Soldiers", men: 3330 },
  { squadron: "Portugal", role: "Sailors", men: 1293 },
  { squadron: "Biscay", role: "Soldiers", men: 1937 },
  { squadron: "Biscay", role: "Sailors", men: 863 },
  { squadron: "Castile", role: "Soldiers", men: 2458 },
  { squadron: "Castile", role: "Sailors", men: 1719 },
  { squadron: "Andalusia", role: "Soldiers", men: 2325 },
  { squadron: "Andalusia", role: "Sailors", men: 780 },
  { squadron: "Guipúzcoa", role: "Soldiers", men: 1992 },
  { squadron: "Guipúzcoa", role: "Sailors", men: 616 },
  { squadron: "Levant", role: "Soldiers", men: 2780 },
  { squadron: "Levant", role: "Sailors", men: 767 },
  { squadron: "Hulks", role: "Soldiers", men: 3121 },
  { squadron: "Hulks", role: "Sailors", men: 608 },
  { squadron: "Pataches", role: "Soldiers", men: 479 },
  { squadron: "Pataches", role: "Sailors", men: 574 },
  { squadron: "Naples", role: "Soldiers", men: 873 },
  { squadron: "Naples", role: "Sailors", men: 468 },
  { squadron: "Galleys", role: "Soldiers", men: 0 },
  { squadron: "Galleys", role: "Sailors", men: 362 },
] as const;
