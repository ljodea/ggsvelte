/**
 * The Spanish Armada of 1588 by squadron, from the muster drawn up for the
 * Duke of Medina Sidonia before the fleet sailed: how many ships each squadron
 * had, and how many men were aboard them. The two galley squadrons carried
 * theirs in four hulls apiece; the pataches, twenty-two of them, carried the
 * fewest men for their number of ships.
 *
 * Transcribed from HistData::Armada (see NOTICE); 10 squadrons. Squadron names
 * are given in their common English forms - the source carries the abbreviated
 * and partly garbled forms of the original manifest. `men` is soldiers and
 * sailors together.
 */
export const armadaSquadrons: { squadron: string; ships: number; men: number }[] = [
  { squadron: "Portugal", ships: 12, men: 4623 },
  { squadron: "Biscay", ships: 14, men: 2800 },
  { squadron: "Castile", ships: 16, men: 4171 },
  { squadron: "Andalusia", ships: 11, men: 3105 },
  { squadron: "Guipuzcoa", ships: 14, men: 2608 },
  { squadron: "Levant", ships: 10, men: 3523 },
  { squadron: "Hulks", ships: 23, men: 3729 },
  { squadron: "Pataches", ships: 22, men: 1093 },
  { squadron: "Naples", ships: 4, men: 1341 },
  { squadron: "Galleys", ships: 4, men: 362 },
];
