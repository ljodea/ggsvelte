/**
 * Cushny and Peebles' 1905 soporific trial: extra hours of sleep gained by
 * eleven patients under a control and three hypnotic drugs. "Student" used these
 * numbers as the worked example in "The Probable Error of a Mean" (Biometrika,
 * 1908) - the paper that introduced the t-distribution - and they have been the
 * standard teaching data for paired comparison ever since.
 *
 * Transcribed from HistData::CushnyPeebles (see NOTICE); 11 patient rows x 4
 * treatments, less the one missing control observation = 43 rows. Fisher later
 * pointed out that Student had mislabelled two of the drugs; the labels here
 * are the corrected ones carried by the source.
 */
export const soporifics: { drug: string; extraSleep: number }[] = [
  { drug: "Control", extraSleep: 0.6 },
  { drug: "Control", extraSleep: 3 },
  { drug: "Control", extraSleep: 4.7 },
  { drug: "Control", extraSleep: 5.5 },
  { drug: "Control", extraSleep: 6.2 },
  { drug: "Control", extraSleep: 3.2 },
  { drug: "Control", extraSleep: 2.5 },
  { drug: "Control", extraSleep: 2.8 },
  { drug: "Control", extraSleep: 1.1 },
  { drug: "Control", extraSleep: 2.9 },
  { drug: "L-hyoscyamine", extraSleep: 1.3 },
  { drug: "L-hyoscyamine", extraSleep: 1.4 },
  { drug: "L-hyoscyamine", extraSleep: 4.5 },
  { drug: "L-hyoscyamine", extraSleep: 4.3 },
  { drug: "L-hyoscyamine", extraSleep: 6.1 },
  { drug: "L-hyoscyamine", extraSleep: 6.6 },
  { drug: "L-hyoscyamine", extraSleep: 6.2 },
  { drug: "L-hyoscyamine", extraSleep: 3.6 },
  { drug: "L-hyoscyamine", extraSleep: 1.1 },
  { drug: "L-hyoscyamine", extraSleep: 4.9 },
  { drug: "L-hyoscyamine", extraSleep: 6.3 },
  { drug: "L-hyoscine", extraSleep: 2.5 },
  { drug: "L-hyoscine", extraSleep: 3.8 },
  { drug: "L-hyoscine", extraSleep: 5.8 },
  { drug: "L-hyoscine", extraSleep: 5.6 },
  { drug: "L-hyoscine", extraSleep: 6.1 },
  { drug: "L-hyoscine", extraSleep: 7.6 },
  { drug: "L-hyoscine", extraSleep: 8 },
  { drug: "L-hyoscine", extraSleep: 4.4 },
  { drug: "L-hyoscine", extraSleep: 5.7 },
  { drug: "L-hyoscine", extraSleep: 6.3 },
  { drug: "L-hyoscine", extraSleep: 6.8 },
  { drug: "DL-hyoscine", extraSleep: 2.1 },
  { drug: "DL-hyoscine", extraSleep: 4.4 },
  { drug: "DL-hyoscine", extraSleep: 4.7 },
  { drug: "DL-hyoscine", extraSleep: 4.8 },
  { drug: "DL-hyoscine", extraSleep: 6.7 },
  { drug: "DL-hyoscine", extraSleep: 8.3 },
  { drug: "DL-hyoscine", extraSleep: 8.2 },
  { drug: "DL-hyoscine", extraSleep: 4.3 },
  { drug: "DL-hyoscine", extraSleep: 5.8 },
  { drug: "DL-hyoscine", extraSleep: 6.4 },
  { drug: "DL-hyoscine", extraSleep: 7.3 },
];
