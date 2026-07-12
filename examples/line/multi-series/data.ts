/** Mean monthly temperature (°C) for three cities — classic climate normals. */
const monthly: Record<string, readonly number[]> = {
  Reykjavik: [-0.5, 0.4, 0.5, 2.9, 6.3, 9.0, 10.6, 10.3, 7.4, 4.4, 1.1, -0.2],
  Berlin: [0.6, 1.4, 4.8, 9.0, 14.0, 17.0, 19.0, 18.9, 14.7, 9.9, 5.0, 1.9],
  Singapore: [26.5, 27.1, 27.5, 28.0, 28.3, 28.3, 27.9, 27.9, 27.6, 27.6, 27.0, 26.4],
};

export const temperatures: { city: string; month: number; temp: number }[] = [];
for (const [city, temps] of Object.entries(monthly)) {
  temps.forEach((temp, i) => {
    temperatures.push({ city, month: i + 1, temp });
  });
}
