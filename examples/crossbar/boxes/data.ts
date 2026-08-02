/**
 * Three pre-computed group intervals for the interval-family geoms.
 * The 96×96 geoms-index crop needs a few tall marks; raw SE on dense
 * observations is too short to read at that size, so these bounds are
 * wide on purpose (identity ymin/ymax, not summary).
 */
export const groupIntervals: {
  group: string;
  mid: number;
  lo: number;
  hi: number;
}[] = [
  { group: "A", mid: 5, lo: 1.5, hi: 8.5 },
  { group: "B", mid: 7.5, lo: 4, hi: 11 },
  { group: "C", mid: 3.5, lo: 0.5, hi: 6.5 },
];
