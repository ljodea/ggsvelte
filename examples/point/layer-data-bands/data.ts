/**
 * Three tables about one chart: William Playfair's series of the British
 * national debt, 1770-1824, the two wars he drew it to explain, and the note
 * he would have written on it.
 *
 * The debt is transcribed from HistData::Playfair1824 (see NOTICE); 55 annual
 * figures in millions of pounds, the units Playfair drew. The war years are
 * the standard dates - the American War of Independence, in which Britain
 * fought from 1775 to 1783, and the French Revolutionary and Napoleonic Wars,
 * 1793 to 1815 - and they are annotation, not measurement, which is exactly
 * why they live in their own table.
 */
export const nationalDebt: { year: number; debt: number }[] = [
  { year: 1770, debt: 13.96 },
  { year: 1771, debt: 13.97 },
  { year: 1772, debt: 13.67 },
  { year: 1773, debt: 13.68 },
  { year: 1774, debt: 13.69 },
  { year: 1775, debt: 14.88 },
  { year: 1776, debt: 16.07 },
  { year: 1777, debt: 16.97 },
  { year: 1778, debt: 18.16 },
  { year: 1779, debt: 19.06 },
  { year: 1780, debt: 20.55 },
  { year: 1781, debt: 21.74 },
  { year: 1782, debt: 22.94 },
  { year: 1783, debt: 24.43 },
  { year: 1784, debt: 24.43 },
  { year: 1785, debt: 24.44 },
  { year: 1786, debt: 24.44 },
  { year: 1787, debt: 24.45 },
  { year: 1788, debt: 24.46 },
  { year: 1789, debt: 24.46 },
  { year: 1790, debt: 24.76 },
  { year: 1791, debt: 24.77 },
  { year: 1792, debt: 24.77 },
  { year: 1793, debt: 25.08 },
  { year: 1794, debt: 27.75 },
  { year: 1795, debt: 30.73 },
  { year: 1796, debt: 33.71 },
  { year: 1797, debt: 36.98 },
  { year: 1798, debt: 39.96 },
  { year: 1799, debt: 41.15 },
  { year: 1800, debt: 42.34 },
  { year: 1801, debt: 43.54 },
  { year: 1802, debt: 44.73 },
  { year: 1803, debt: 44.74 },
  { year: 1804, debt: 45.04 },
  { year: 1805, debt: 45.94 },
  { year: 1806, debt: 47.43 },
  { year: 1807, debt: 49.21 },
  { year: 1808, debt: 51.6 },
  { year: 1809, debt: 54.57 },
  { year: 1810, debt: 57.84 },
  { year: 1811, debt: 61.12 },
  { year: 1812, debt: 64.39 },
  { year: 1813, debt: 67.66 },
  { year: 1814, debt: 70.94 },
  { year: 1815, debt: 73.91 },
  { year: 1816, debt: 74.81 },
  { year: 1817, debt: 75.11 },
  { year: 1818, debt: 75.12 },
  { year: 1819, debt: 75.42 },
  { year: 1820, debt: 75.42 },
  { year: 1821, debt: 75.73 },
  { year: 1822, debt: 75.73 },
  { year: 1823, debt: 76.03 },
  { year: 1824, debt: 76.04 },
];

/** War years, as bands to be drawn behind the series. */
export const warYears: {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  war: string;
}[] = [
  { xmin: 1775, xmax: 1783, ymin: 0, ymax: 80, war: "American War of Independence" },
  { xmin: 1793, xmax: 1815, ymin: 0, ymax: 80, war: "French Revolutionary and Napoleonic Wars" },
];

/** One note, placed where the reader should look. */
export const callouts: { year: number; debt: number; label: string }[] = [
  { year: 1798, debt: 72, label: "Debt nearly trebles between 1793 and 1815" },
];
