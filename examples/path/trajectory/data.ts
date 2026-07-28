/**
 * Charles Minard's 1869 chart of Napoleon's Russian campaign, reduced to the
 * two columns that carry its argument: how far east the army had marched, and
 * how many men were left. 422,000 crossed the Niemen in June 1812; 100,000
 * reached Moscow; 10,000 came back.
 *
 * Transcribed from HistData::Minard.troops (see NOTICE); 51 rows tracing three
 * columns of the army out and back. `long` is degrees east, `survivors` the
 * strength Minard drew as the width of his band, and `leg` names the column
 * and whether it was advancing or retreating - the group each path follows.
 *
 * The rows are in march order, not longitude order, and the retreat walks back
 * over the same ground: that is why the path has to be drawn in data order.
 */
export const napoleonsArmy: {
  long: number;
  survivors: number;
  direction: string;
  leg: string;
}[] = [
  { long: 24, survivors: 340000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 24.5, survivors: 340000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 25.5, survivors: 340000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 26, survivors: 320000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 27, survivors: 300000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 28, survivors: 280000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 28.5, survivors: 240000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 29, survivors: 210000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 30, survivors: 180000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 30.3, survivors: 175000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 32, survivors: 145000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 33.2, survivors: 140000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 34.4, survivors: 127100, direction: "Advance", leg: "Column 1 Advance" },
  { long: 35.5, survivors: 100000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 36, survivors: 100000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 37.6, survivors: 100000, direction: "Advance", leg: "Column 1 Advance" },
  { long: 37.7, survivors: 100000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 37.5, survivors: 98000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 37, survivors: 97000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 36.8, survivors: 96000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 35.4, survivors: 87000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 34.3, survivors: 55000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 33.3, survivors: 37000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 32, survivors: 24000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 30.4, survivors: 20000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 29.2, survivors: 20000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 28.5, survivors: 20000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 28.3, survivors: 20000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 27.5, survivors: 20000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 26.8, survivors: 12000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 26.4, survivors: 14000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 25, survivors: 8000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 24.4, survivors: 4000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 24.2, survivors: 4000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 24.1, survivors: 4000, direction: "Retreat", leg: "Column 1 Retreat" },
  { long: 24, survivors: 60000, direction: "Advance", leg: "Column 2 Advance" },
  { long: 24.5, survivors: 60000, direction: "Advance", leg: "Column 2 Advance" },
  { long: 25.5, survivors: 60000, direction: "Advance", leg: "Column 2 Advance" },
  { long: 26.6, survivors: 40000, direction: "Advance", leg: "Column 2 Advance" },
  { long: 27.4, survivors: 33000, direction: "Advance", leg: "Column 2 Advance" },
  { long: 28.7, survivors: 33000, direction: "Advance", leg: "Column 2 Advance" },
  { long: 28.7, survivors: 33000, direction: "Retreat", leg: "Column 2 Retreat" },
  { long: 29.2, survivors: 30000, direction: "Retreat", leg: "Column 2 Retreat" },
  { long: 28.5, survivors: 30000, direction: "Retreat", leg: "Column 2 Retreat" },
  { long: 28.3, survivors: 28000, direction: "Retreat", leg: "Column 2 Retreat" },
  { long: 24, survivors: 22000, direction: "Advance", leg: "Column 3 Advance" },
  { long: 24.5, survivors: 22000, direction: "Advance", leg: "Column 3 Advance" },
  { long: 24.6, survivors: 6000, direction: "Advance", leg: "Column 3 Advance" },
  { long: 24.6, survivors: 6000, direction: "Retreat", leg: "Column 3 Retreat" },
  { long: 24.2, survivors: 6000, direction: "Retreat", leg: "Column 3 Retreat" },
  { long: 24.1, survivors: 6000, direction: "Retreat", leg: "Column 3 Retreat" },
];
