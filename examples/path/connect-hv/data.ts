/**
 * The nine thermometer readings Minard drew beneath the retreat from Moscow,
 * in degrees Réaumur - so the -30 at Bobr is about -37 Celsius. The army had
 * already lost most of its strength before the cold arrived; Minard put the
 * temperature under the map so the two could be read together.
 *
 * Transcribed from HistData::Minard.temp (see NOTICE); 9 readings, ordered
 * east to west along the retreat. `date` is the day Minard recorded against
 * the reading - the fifth has none in the source and is left blank.
 */
export const retreatCold: { long: number; temp: number; date: string }[] = [
  { long: 37.6, temp: 0, date: "Oct18" },
  { long: 36, temp: 0, date: "Oct24" },
  { long: 33.2, temp: -9, date: "Nov09" },
  { long: 32, temp: -21, date: "Nov14" },
  { long: 29.2, temp: -11, date: "" },
  { long: 28.5, temp: -20, date: "Nov28" },
  { long: 27.2, temp: -24, date: "Dec01" },
  { long: 26.7, temp: -30, date: "Dec06" },
  { long: 25.3, temp: -26, date: "Dec07" },
];
