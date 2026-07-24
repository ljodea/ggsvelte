/**
 * The first scatterplot ever published: John F. W. Herschel's 1833 plot of the
 * position angle of the double star gamma Virginis against the year of
 * observation ("On the Investigation of the Orbits of Revolving Double Stars",
 * Memoirs of the Royal Astronomical Society). Herschel drew a smooth curve
 * through the points by hand and read the orbit off it - which is what a loess
 * smooth does mechanically.
 *
 * Transcribed from HistData::Virginis (see NOTICE). The source has 18 rows; the
 * 4 with no recorded position angle are dropped, leaving 14. `weight` is
 * Herschel's own confidence in each observation, from 0.1 ("very uncertain",
 * Cassini 1720) to 8 (his own mean of eight measures).
 */
export const gammaVirginis: { year: number; angle: number; weight: number; observer: string }[] = [
  { year: 1718.19, angle: 160.87, weight: 4, observer: "Pound" },
  { year: 1718.2, angle: 160.87, weight: 4, observer: "Bradley" },
  { year: 1720.31, angle: 139.12, weight: 0.1, observer: "Cassini" },
  { year: 1756, angle: 144.37, weight: 4, observer: "Mayer" },
  { year: 1781.89, angle: 130.73, weight: 4, observer: "H" },
  { year: 1803.2, angle: 120.25, weight: 8, observer: "H" },
  { year: 1820.2, angle: 105.25, weight: 4, observer: "Sigma" },
  { year: 1822.25, angle: 103.4, weight: 4, observer: "Sh" },
  { year: 1822.5, angle: 102.4, weight: 4, observer: "Sigma" },
  { year: 1825.32, angle: 96.88, weight: 4, observer: "S" },
  { year: 1825.35, angle: 97.97, weight: 4, observer: "Sigma" },
  { year: 1828.35, angle: 90.5, weight: 1, observer: "h" },
  { year: 1829.22, angle: 87.72, weight: 2, observer: "h" },
  { year: 1830.38, angle: 82.08, weight: 6, observer: "h" },
];
