/**
 * "Student" (W. S. Gosset), "On the Error of Counting with a Haemacytometer"
 * (Biometrika, 1907): yeast cells counted in the 400 squares of a
 * haemacytometer grid, repeated over four samples. Gosset used these counts to
 * show that cell counts follow a Poisson distribution - the paper that made
 * counting under a microscope a statistical problem.
 *
 * Transcribed from HistData::Yeast (see NOTICE); 400 squares were counted per
 * sample, and each sample occupies 6 to 13 count levels, for 36 rows and 1,600
 * squares in total. `squares` is a count, so the sample order
 * A -> D is the authored panel order, not an alphabetical accident.
 */
export const yeastCounts: { sample: string; cells: number; squares: number }[] = [
  { sample: "A", cells: 0, squares: 213 },
  { sample: "A", cells: 1, squares: 128 },
  { sample: "A", cells: 2, squares: 37 },
  { sample: "A", cells: 3, squares: 18 },
  { sample: "A", cells: 4, squares: 3 },
  { sample: "A", cells: 5, squares: 1 },
  { sample: "B", cells: 0, squares: 103 },
  { sample: "B", cells: 1, squares: 143 },
  { sample: "B", cells: 2, squares: 98 },
  { sample: "B", cells: 3, squares: 42 },
  { sample: "B", cells: 4, squares: 8 },
  { sample: "B", cells: 5, squares: 4 },
  { sample: "B", cells: 6, squares: 2 },
  { sample: "C", cells: 0, squares: 75 },
  { sample: "C", cells: 1, squares: 103 },
  { sample: "C", cells: 2, squares: 121 },
  { sample: "C", cells: 3, squares: 54 },
  { sample: "C", cells: 4, squares: 30 },
  { sample: "C", cells: 5, squares: 13 },
  { sample: "C", cells: 6, squares: 2 },
  { sample: "C", cells: 7, squares: 1 },
  { sample: "C", cells: 8, squares: 0 },
  { sample: "C", cells: 9, squares: 1 },
  { sample: "D", cells: 0, squares: 0 },
  { sample: "D", cells: 1, squares: 20 },
  { sample: "D", cells: 2, squares: 43 },
  { sample: "D", cells: 3, squares: 53 },
  { sample: "D", cells: 4, squares: 86 },
  { sample: "D", cells: 5, squares: 70 },
  { sample: "D", cells: 6, squares: 54 },
  { sample: "D", cells: 7, squares: 37 },
  { sample: "D", cells: 8, squares: 18 },
  { sample: "D", cells: 9, squares: 10 },
  { sample: "D", cells: 10, squares: 5 },
  { sample: "D", cells: 11, squares: 2 },
  { sample: "D", cells: 12, squares: 2 },
];

/** Gosset's own sample order; also the authored panel order. */
export const SAMPLES = ["A", "B", "C", "D"] as const;

export type Sample = (typeof SAMPLES)[number];

export const SAMPLE_LABELS: Record<Sample, string> = {
  A: "Sample A",
  B: "Sample B",
  C: "Sample C",
  D: "Sample D",
};
