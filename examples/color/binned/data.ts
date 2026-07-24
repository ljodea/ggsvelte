/**
 * W. Stanley Jevons' 1871 experiment on himself, reported in a brief note in
 * Nature: he threw an uncertain number of black beans into a box and estimated
 * the count instantly, "without the least hesitation", 1,027 times. He was
 * never wrong up to four beans and increasingly wrong above it - the first
 * measurement of what Miller would later call the magical number seven.
 *
 * Transcribed from HistData::Jevons (see NOTICE). The source is the 13x13
 * frequency table of estimated against actual; the 50 cells that were ever
 * observed are kept. `trials` counts how often that pairing happened, so the
 * colour bands here are counts of repeated trials, not a restatement of x or y.
 */
export const jevonsTrials: { actual: number; estimated: number; trials: number }[] = [
  { actual: 3, estimated: 3, trials: 23 },
  { actual: 4, estimated: 4, trials: 65 },
  { actual: 5, estimated: 5, trials: 102 },
  { actual: 6, estimated: 5, trials: 7 },
  { actual: 5, estimated: 6, trials: 4 },
  { actual: 6, estimated: 6, trials: 120 },
  { actual: 7, estimated: 6, trials: 18 },
  { actual: 5, estimated: 7, trials: 1 },
  { actual: 6, estimated: 7, trials: 20 },
  { actual: 7, estimated: 7, trials: 113 },
  { actual: 8, estimated: 7, trials: 30 },
  { actual: 9, estimated: 7, trials: 2 },
  { actual: 7, estimated: 8, trials: 25 },
  { actual: 8, estimated: 8, trials: 76 },
  { actual: 9, estimated: 8, trials: 24 },
  { actual: 10, estimated: 8, trials: 6 },
  { actual: 11, estimated: 8, trials: 1 },
  { actual: 8, estimated: 9, trials: 28 },
  { actual: 9, estimated: 9, trials: 76 },
  { actual: 10, estimated: 9, trials: 37 },
  { actual: 11, estimated: 9, trials: 11 },
  { actual: 12, estimated: 9, trials: 1 },
  { actual: 8, estimated: 10, trials: 1 },
  { actual: 9, estimated: 10, trials: 18 },
  { actual: 10, estimated: 10, trials: 46 },
  { actual: 11, estimated: 10, trials: 19 },
  { actual: 12, estimated: 10, trials: 4 },
  { actual: 9, estimated: 11, trials: 2 },
  { actual: 10, estimated: 11, trials: 16 },
  { actual: 11, estimated: 11, trials: 26 },
  { actual: 12, estimated: 11, trials: 17 },
  { actual: 13, estimated: 11, trials: 7 },
  { actual: 14, estimated: 11, trials: 2 },
  { actual: 10, estimated: 12, trials: 2 },
  { actual: 11, estimated: 12, trials: 12 },
  { actual: 12, estimated: 12, trials: 19 },
  { actual: 13, estimated: 12, trials: 11 },
  { actual: 14, estimated: 12, trials: 3 },
  { actual: 15, estimated: 12, trials: 2 },
  { actual: 12, estimated: 13, trials: 3 },
  { actual: 13, estimated: 13, trials: 6 },
  { actual: 14, estimated: 13, trials: 3 },
  { actual: 15, estimated: 13, trials: 1 },
  { actual: 12, estimated: 14, trials: 1 },
  { actual: 13, estimated: 14, trials: 1 },
  { actual: 14, estimated: 14, trials: 4 },
  { actual: 15, estimated: 14, trials: 6 },
  { actual: 13, estimated: 15, trials: 1 },
  { actual: 14, estimated: 15, trials: 2 },
  { actual: 15, estimated: 15, trials: 2 },
];
