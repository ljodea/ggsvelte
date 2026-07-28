/**
 * Charles Darwin's 1876 experiment on cross- and self-fertilisation: fifteen
 * pairs of Zea mays seedlings, one raised from a cross-fertilised seed and the
 * other from a self-fertilised one, grown side by side in the same pot. Here
 * each pair is reduced to one number - how much taller the crossed plant was,
 * in inches - and the fifteen differences are sorted into their empirical
 * distribution.
 *
 * Transcribed from HistData::ZeaMays (see NOTICE); 15 pairs. `share` is the
 * plotting position i/n after sorting, so the curve is the ECDF drawn from
 * precomputed coordinates rather than from stat ecdf. Where it crosses zero
 * reads off Darwin's result: two of the fifteen pairs went the other way.
 *
 * Fisher used these fifteen differences in The Design of Experiments (1935) to
 * illustrate both the paired t-test and one of the first permutation tests.
 */
export const maizeDifferences: { difference: number; share: number }[] = [
  { difference: -8.375, share: 0.0667 },
  { difference: -6, share: 0.1333 },
  { difference: 0.75, share: 0.2 },
  { difference: 1, share: 0.2667 },
  { difference: 1.75, share: 0.3333 },
  { difference: 2, share: 0.4 },
  { difference: 2.875, share: 0.4667 },
  { difference: 3, share: 0.5333 },
  { difference: 3.5, share: 0.6 },
  { difference: 3.625, share: 0.6667 },
  { difference: 5.125, share: 0.7333 },
  { difference: 6.125, share: 0.8 },
  { difference: 7, share: 0.8667 },
  { difference: 7.5, share: 0.9333 },
  { difference: 9.375, share: 1 },
];
