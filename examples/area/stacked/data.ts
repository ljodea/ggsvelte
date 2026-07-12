/** Electricity generation mix (TWh) for a fictional grid, 2014–2025. */
const bySource: Record<string, readonly number[]> = {
  //     2014 2015 2016 2017 2018 2019 2020 2021 2022 2023 2024 2025
  fossil: [92, 90, 87, 85, 80, 74, 66, 60, 55, 48, 41, 35],
  nuclear: [30, 30, 29, 29, 28, 28, 27, 26, 26, 25, 25, 24],
  renewables: [14, 17, 21, 26, 32, 39, 45, 54, 63, 74, 86, 99],
};

export const generation: { year: number; source: string; twh: number }[] = [];
for (const [source, series] of Object.entries(bySource)) {
  series.forEach((twh, i) => {
    generation.push({ year: 2014 + i, source, twh });
  });
}
