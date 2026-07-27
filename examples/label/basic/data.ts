/**
 * The twelve determinations on van Langren's 1644 graph of the longitude
 * distance between Toledo and Rome - the first known graph of statistical data.
 * Van Langren labelled each estimate with the name of the astronomer who made
 * it, which is why the labels here are the data rather than decoration.
 *
 * Transcribed from HistData::Langren1644 (see NOTICE); 12 rows. The true
 * distance is 16.53 degrees (Toledo -4.03, Rome 12.50); every estimate on the
 * graph overshoots it, by between 1 and 14 degrees.
 *
 * `rank` orders the estimates smallest-first and exists only to stagger the
 * twelve names down the panel so none of them collide. Van Langren's own graph
 * was one-dimensional and he staggered the names for the same reason; the
 * astronomers' dates run from Ptolemy to 1644 and would compress eleven of the
 * twelve into a strip if plotted.
 */
export const langren1644: {
  rank: number;
  name: string;
  longitude: number;
  year: number;
  source: string;
}[] = [
  { rank: 1, name: "G. Jansonius", longitude: 17.736, year: 1605, source: "Map" },
  { rank: 2, name: "G. Mercator", longitude: 19.872, year: 1567, source: "Map" },
  { rank: 3, name: "I. Schonerus", longitude: 20.638, year: 1536, source: "Astronomy" },
  { rank: 4, name: "P. Lantsbergius", longitude: 21.106, year: 1530, source: "Astronomy" },
  { rank: 5, name: "T. Brahe", longitude: 21.447, year: 1578, source: "Astronomy" },
  { rank: 6, name: "I. Regiomontanus", longitude: 25.617, year: 1463, source: "Astronomy" },
  { rank: 7, name: "Orontius", longitude: 26, year: 1542, source: "Astronomy" },
  { rank: 8, name: "C. Clavius", longitude: 26.34, year: 1567, source: "Astronomy" },
  { rank: 9, name: "C. Ptolomeus", longitude: 27.787, year: 150, source: "Astronomy" },
  { rank: 10, name: "A. Argelius", longitude: 28.17, year: 1610, source: "Astronomy" },
  { rank: 11, name: "A. Maginus", longitude: 29.787, year: 1582, source: "Astronomy" },
  { rank: 12, name: "D. Origanus", longitude: 30.128, year: 1601, source: "Astronomy" },
];
