/**
 * Michael van Langren's estimates of the longitude distance between Toledo and
 * Rome, pooled from every known version of his graph (1628, 1632, 1633, 1644,
 * and Lelewel's 1851 reproduction): 61 determinations by named astronomers.
 *
 * Van Langren's 1644 chart is believed to be the first known graph of
 * statistical data, and it was a one-dimensional strip of exactly these values
 * - which is what a rug is. He drew it to show the Spanish court how badly the
 * estimates disagreed, and so how dangerous navigation by longitude was.
 *
 * Transcribed from HistData::Langren.all (see NOTICE); 61 rows. The true
 * distance is 16.53 degrees (Toledo -4.03, Rome 12.50), so every single
 * estimate here is too large - the rug sits entirely to the right of the truth.
 */
export const longitudeEstimates: { graph: string; longitude: number }[] = [
  { graph: "Langren 1628", longitude: 17.691 },
  { graph: "Langren 1628", longitude: 19.67 },
  { graph: "Langren 1628", longitude: 20.784 },
  { graph: "Langren 1628", longitude: 24.247 },
  { graph: "Langren 1628", longitude: 25.546 },
  { graph: "Langren 1628", longitude: 26.536 },
  { graph: "Langren 1628", longitude: 27.773 },
  { graph: "Langren 1632", longitude: 17.674 },
  { graph: "Langren 1632", longitude: 18.206 },
  { graph: "Langren 1632", longitude: 19.169 },
  { graph: "Langren 1632", longitude: 19.402 },
  { graph: "Langren 1632", longitude: 19.701 },
  { graph: "Langren 1632", longitude: 20.365 },
  { graph: "Langren 1632", longitude: 20.764 },
  { graph: "Langren 1632", longitude: 21.495 },
  { graph: "Langren 1632", longitude: 25.548 },
  { graph: "Langren 1632", longitude: 26.213 },
  { graph: "Langren 1632", longitude: 26.213 },
  { graph: "Langren 1632", longitude: 26.711 },
  { graph: "Langren 1632", longitude: 27.375 },
  { graph: "Langren 1632", longitude: 27.708 },
  { graph: "Langren 1632", longitude: 27.708 },
  { graph: "Langren 1633", longitude: 17.373 },
  { graph: "Langren 1633", longitude: 17.891 },
  { graph: "Langren 1633", longitude: 18.791 },
  { graph: "Langren 1633", longitude: 19.064 },
  { graph: "Langren 1633", longitude: 19.418 },
  { graph: "Langren 1633", longitude: 20.154 },
  { graph: "Langren 1633", longitude: 20.673 },
  { graph: "Langren 1633", longitude: 21.327 },
  { graph: "Langren 1633", longitude: 25.118 },
  { graph: "Langren 1633", longitude: 26.018 },
  { graph: "Langren 1633", longitude: 26.018 },
  { graph: "Langren 1633", longitude: 26.536 },
  { graph: "Langren 1633", longitude: 27.055 },
  { graph: "Langren 1633", longitude: 27.464 },
  { graph: "Langren 1633", longitude: 27.464 },
  { graph: "Langren 1644", longitude: 17.62 },
  { graph: "Langren 1644", longitude: 19.648 },
  { graph: "Langren 1644", longitude: 20.751 },
  { graph: "Langren 1644", longitude: 21.133 },
  { graph: "Langren 1644", longitude: 21.413 },
  { graph: "Langren 1644", longitude: 25.467 },
  { graph: "Langren 1644", longitude: 26.047 },
  { graph: "Langren 1644", longitude: 26.508 },
  { graph: "Langren 1644", longitude: 27.651 },
  { graph: "Langren 1644", longitude: 28.054 },
  { graph: "Langren 1644", longitude: 29.799 },
  { graph: "Langren 1644", longitude: 30.06 },
  { graph: "Lelewel 1851", longitude: 17.432 },
  { graph: "Lelewel 1851", longitude: 19.901 },
  { graph: "Lelewel 1851", longitude: 20.669 },
  { graph: "Lelewel 1851", longitude: 21.053 },
  { graph: "Lelewel 1851", longitude: 21.436 },
  { graph: "Lelewel 1851", longitude: 25.609 },
  { graph: "Lelewel 1851", longitude: 25.994 },
  { graph: "Lelewel 1851", longitude: 26.378 },
  { graph: "Lelewel 1851", longitude: 27.784 },
  { graph: "Lelewel 1851", longitude: 28.166 },
  { graph: "Lelewel 1851", longitude: 29.829 },
  { graph: "Lelewel 1851", longitude: 30.169 },
];
