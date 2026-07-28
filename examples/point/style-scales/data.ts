/**
 * The road Napoleon's army took into Russia and back, from Charles Minard's
 * 1869 chart: longitude and latitude of each place the army's strength was
 * counted, out to Moscow and home again - and the strength itself, which is
 * what Minard drew as the width of his band.
 *
 * Transcribed from HistData::Minard.troops (see NOTICE); 51 rows tracing three
 * columns of the army. `leg` names the column and the direction, which is the
 * group each path follows; `survivors` is the strength Minard drew as the
 * width of his band. examples/path/trajectory plots the same table against
 * strength rather than as a map, and examples/point/void-chrome maps it with
 * no chrome at all.
 *
 * Degrees of longitude and latitude are not to the same scale on the ground,
 * and there is no projection here - so this is the shape of Minard's own
 * drawing, not a survey.
 */
export const marchRoute: {
  long: number;
  lat: number;
  survivors: number;
  direction: string;
  leg: string;
}[] = [
  { long: 24, lat: 54.9, survivors: 340000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 24.5, lat: 55, survivors: 340000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 25.5, lat: 54.5, survivors: 340000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 26, lat: 54.7, survivors: 320000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 27, lat: 54.8, survivors: 300000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 28, lat: 54.9, survivors: 280000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 28.5, lat: 55, survivors: 240000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 29, lat: 55.1, survivors: 210000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 30, lat: 55.2, survivors: 180000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 30.3, lat: 55.3, survivors: 175000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 32, lat: 54.8, survivors: 145000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 33.2, lat: 54.9, survivors: 140000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 34.4, lat: 55.5, survivors: 127100, direction: "Advance", leg: "Column 1 Advance" },
  { long: 35.5, lat: 55.4, survivors: 100000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 36, lat: 55.5, survivors: 100000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 37.6, lat: 55.8, survivors: 100000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 37.7, lat: 55.7, survivors: 100000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 37.5, lat: 55.7, survivors: 98000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 37, lat: 55, survivors: 97000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 36.8, lat: 55, survivors: 96000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 35.4, lat: 55.3, survivors: 87000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 34.3, lat: 55.2, survivors: 55000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 33.3, lat: 54.8, survivors: 37000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 32, lat: 54.6, survivors: 24000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 30.4, lat: 54.4, survivors: 20000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 29.2, lat: 54.3, survivors: 20000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 28.5, lat: 54.2, survivors: 20000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 28.3, lat: 54.3, survivors: 20000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 27.5, lat: 54.5, survivors: 20000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 26.8, lat: 54.3, survivors: 12000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 26.4, lat: 54.4, survivors: 14000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 25, lat: 54.4, survivors: 8000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 24.4, lat: 54.4, survivors: 4000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 24.2, lat: 54.4, survivors: 4000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 24.1, lat: 54.4, survivors: 4000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 24, lat: 55.1, survivors: 60000, direction: "Advance", leg: "Column 2 Advance" },
  { long: 24.5, lat: 55.2, survivors: 60000, direction: "Advance", leg: "Column 2 Advance" },
  { long: 25.5, lat: 54.7, survivors: 60000, direction: "Advance", leg: "Column 2 Advance" },
  { long: 26.6, lat: 55.7, survivors: 40000, direction: "Advance", leg: "Column 2 Advance" },
  { long: 27.4, lat: 55.6, survivors: 33000, direction: "Advance", leg: "Column 2 Advance" },
  { long: 28.7, lat: 55.5, survivors: 33000, direction: "Advance", leg: "Column 2 Advance" },
  { long: 28.7, lat: 55.5, survivors: 33000, direction: "Retreat", leg: "Column 2 Retreat" },
  { long: 29.2, lat: 54.2, survivors: 30000, direction: "Retreat", leg: "Column 2 Retreat" },
  { long: 28.5, lat: 54.1, survivors: 30000, direction: "Retreat", leg: "Column 2 Retreat" },
  { long: 28.3, lat: 54.2, survivors: 28000, direction: "Retreat", leg: "Column 2 Retreat" },
  { long: 24, lat: 55.2, survivors: 22000, direction: "Advance", leg: "Column 3 Advance" },
  { long: 24.5, lat: 55.3, survivors: 22000, direction: "Advance", leg: "Column 3 Advance" },
  { long: 24.6, lat: 55.8, survivors: 6000, direction: "Advance", leg: "Column 3 Advance" },
  { long: 24.6, lat: 55.8, survivors: 6000, direction: "Retreat", leg: "Column 3 Retreat" },
  { long: 24.2, lat: 54.4, survivors: 6000, direction: "Retreat", leg: "Column 3 Retreat" },
  { long: 24.1, lat: 54.4, survivors: 6000, direction: "Retreat", leg: "Column 3 Retreat" },
];
