/**
 * Charles Darwin's 1876 experiment on cross- and self-fertilisation: fifteen
 * pairs of Zea mays seedlings, one of each pair raised from a cross-fertilised
 * seed and the other from a self-fertilised one, otherwise grown side by side.
 * Heights are the final height in inches, to the nearest eighth.
 *
 * Fisher used these fifteen pairs in The Design of Experiments (1935) to
 * illustrate the paired t-test, and later in the same book as one of the first
 * worked permutation tests.
 *
 * Transcribed from HistData::ZeaMays (see NOTICE); 15 pairs. Each row draws one
 * segment from the self-fertilised height to the cross-fertilised height, so
 * the direction of the segment is Darwin's result.
 */
export const darwinMaize: { pair: number; cross: number; self: number; winner: string }[] = [
  { pair: 1, self: 17.375, cross: 23.5, winner: "Cross-fertilised taller" },
  { pair: 2, self: 20.375, cross: 12, winner: "Self-fertilised taller" },
  { pair: 3, self: 20, cross: 21, winner: "Cross-fertilised taller" },
  { pair: 4, self: 20, cross: 22, winner: "Cross-fertilised taller" },
  { pair: 5, self: 18.375, cross: 19.125, winner: "Cross-fertilised taller" },
  { pair: 6, self: 18.625, cross: 21.5, winner: "Cross-fertilised taller" },
  { pair: 7, self: 18.625, cross: 22.125, winner: "Cross-fertilised taller" },
  { pair: 8, self: 15.25, cross: 20.375, winner: "Cross-fertilised taller" },
  { pair: 9, self: 16.5, cross: 18.25, winner: "Cross-fertilised taller" },
  { pair: 10, self: 18, cross: 21.625, winner: "Cross-fertilised taller" },
  { pair: 11, self: 16.25, cross: 23.25, winner: "Cross-fertilised taller" },
  { pair: 12, self: 18, cross: 21, winner: "Cross-fertilised taller" },
  { pair: 13, self: 12.75, cross: 22.125, winner: "Cross-fertilised taller" },
  { pair: 14, self: 15.5, cross: 23, winner: "Cross-fertilised taller" },
  { pair: 15, self: 18, cross: 12, winner: "Self-fertilised taller" },
];
