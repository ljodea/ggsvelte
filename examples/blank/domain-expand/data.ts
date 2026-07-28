/**
 * Henry Cavendish's 1798 determination of the density of the earth, and the
 * value the experiment was trying to find. Twenty-nine measurements from his
 * torsion balance, expressed relative to the density of water.
 *
 * Transcribed from HistData::Cavendish (see NOTICE). His twenty-nine readings
 * run from 4.88 to 5.85, so a plot of them alone opens the axis on a one-unit
 * window and the headline result - that the earth is more than five times as
 * dense as water - has nothing to be read against. The blank row carries the
 * density of water itself, which no measurement can supply.
 */
export const earthDensity: { trial: number; density: number }[] = [
  { trial: 1, density: 5.5 },
  { trial: 2, density: 5.61 },
  { trial: 3, density: 4.88 },
  { trial: 4, density: 5.07 },
  { trial: 5, density: 5.26 },
  { trial: 6, density: 5.55 },
  { trial: 7, density: 5.36 },
  { trial: 8, density: 5.29 },
  { trial: 9, density: 5.58 },
  { trial: 10, density: 5.65 },
  { trial: 11, density: 5.57 },
  { trial: 12, density: 5.53 },
  { trial: 13, density: 5.62 },
  { trial: 14, density: 5.29 },
  { trial: 15, density: 5.44 },
  { trial: 16, density: 5.34 },
  { trial: 17, density: 5.79 },
  { trial: 18, density: 5.1 },
  { trial: 19, density: 5.27 },
  { trial: 20, density: 5.39 },
  { trial: 21, density: 5.42 },
  { trial: 22, density: 5.47 },
  { trial: 23, density: 5.63 },
  { trial: 24, density: 5.34 },
  { trial: 25, density: 5.46 },
  { trial: 26, density: 5.3 },
  { trial: 27, density: 5.75 },
  { trial: 28, density: 5.68 },
  { trial: 29, density: 5.85 },
];

/** Water, carried as a row with no mark, to hold the y scale open to 1. */
export const waterDensity: { trial: number; density: number }[] = [{ trial: 15, density: 1 }];
