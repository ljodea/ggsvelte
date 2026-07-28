/**
 * Cushny and Peebles' 1905 soporific trial: extra hours of sleep gained by
 * eleven patients under two hypnotic drugs, L-hyoscyamine and L-hyoscine.
 * "Student" used these numbers as the worked example in "The Probable Error of
 * a Mean" (Biometrika, 1908) - the paper that introduced the t-distribution -
 * and the question he was answering is the one a y = x line asks: did the
 * second drug beat the first, patient by patient?
 *
 * Transcribed from HistData::CushnyPeebles (see NOTICE); 11 patients. Hours
 * are gains over the same patient's own control night, so a negative value
 * means the drug cost them sleep.
 */
export const soporifics: { patient: number; hyoscyamine: number; hyoscine: number }[] = [
  { patient: 1, hyoscyamine: 1.3, hyoscine: 2.5 },
  { patient: 2, hyoscyamine: 1.4, hyoscine: 3.8 },
  { patient: 3, hyoscyamine: 4.5, hyoscine: 5.8 },
  { patient: 4, hyoscyamine: 4.3, hyoscine: 5.6 },
  { patient: 5, hyoscyamine: 6.1, hyoscine: 6.1 },
  { patient: 6, hyoscyamine: 6.6, hyoscine: 7.6 },
  { patient: 7, hyoscyamine: 6.2, hyoscine: 8 },
  { patient: 8, hyoscyamine: 3.6, hyoscine: 4.4 },
  { patient: 9, hyoscyamine: 1.1, hyoscine: 5.7 },
  { patient: 10, hyoscyamine: 4.9, hyoscine: 6.3 },
  { patient: 11, hyoscyamine: 6.3, hyoscine: 6.8 },
];
