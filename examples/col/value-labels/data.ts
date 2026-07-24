/**
 * The 1954 Salk polio vaccine field trial - the randomised, placebo-controlled
 * arm covering about 750,000 American schoolchildren. Paralytic polio cases per
 * 100,000, which is the number the trial existed to produce: the vaccinated
 * rate is roughly a third of the placebo rate.
 *
 * Francis et al., "An Evaluation of the 1954 Poliomyelitis Vaccine Trials",
 * 1955. Transcribed from HistData::PolioTrials (see NOTICE). The trial's fourth
 * group, children with incomplete vaccinations, is omitted: one paralytic case
 * in 8,484 children is too few to put on the same axis without misleading.
 */
export const polioTrial = [
  { group: "Vaccinated", rate: 16.4, label: "16.4" },
  { group: "Placebo", rate: 57.1, label: "57.1" },
  { group: "Not inoculated", rate: 35.7, label: "35.7" },
] as const;
