/**
 * Labor cost of a quarter of wheat: Playfair's wheat price (shillings per
 * quarter) divided by a good mechanic's weekly wage (shillings). Unit: weeks
 * of work required to buy one quarter (~8 bushels) of wheat.
 *
 * Same source years as HistData::Wheat / examples/line/multi-series. Years
 * without a wage observation (1815, 1820, 1821 in the original plate) are
 * omitted rather than imputed — the ratio is undefined there.
 *
 * This is the statistic Playfair was arguing for in 1821: toward the end of
 * the series, a quarter of wheat cost fewer weeks of mechanical labour than
 * it had for most of the prior two centuries.
 */
export const laborCostOfWheat = [
  { year: 1565, weeks: 8.2 },
  { year: 1570, weeks: 8.91 },
  { year: 1575, weeks: 8.27 },
  { year: 1580, weeks: 9.57 },
  { year: 1585, weeks: 8.06 },
  { year: 1590, weeks: 8.95 },
  { year: 1595, weeks: 11.55 },
  { year: 1600, weeks: 4.81 },
  { year: 1605, weeks: 5.8 },
  { year: 1610, weeks: 5.54 },
  { year: 1615, weeks: 5.56 },
  { year: 1620, weeks: 5.82 },
  { year: 1625, weeks: 5.39 },
  { year: 1630, weeks: 7.23 },
  { year: 1635, weeks: 5.24 },
  { year: 1640, weeks: 6.12 },
  { year: 1645, weeks: 8.22 },
  { year: 1650, weeks: 6.46 },
  { year: 1655, weeks: 6.14 },
  { year: 1660, weeks: 6.89 },
  { year: 1665, weeks: 4.71 },
  { year: 1670, weeks: 5.36 },
  { year: 1675, weeks: 6.14 },
  { year: 1680, weeks: 4.79 },
  { year: 1685, weeks: 3.55 },
  { year: 1690, weeks: 5 },
  { year: 1695, weeks: 5.88 },
  { year: 1700, weeks: 3.33 },
  { year: 1705, weeks: 3.2 },
  { year: 1710, weeks: 4 },
  { year: 1715, weeks: 2.81 },
  { year: 1720, weeks: 2.32 },
  { year: 1725, weeks: 3 },
  { year: 1730, weeks: 1.95 },
  { year: 1735, weeks: 2.35 },
  { year: 1740, weeks: 1.93 },
  { year: 1745, weeks: 1.9 },
  { year: 1750, weeks: 2.07 },
  { year: 1755, weeks: 2.26 },
  { year: 1760, weeks: 1.88 },
  { year: 1765, weeks: 2.44 },
  { year: 1770, weeks: 2.54 },
  { year: 1775, weeks: 2.26 },
  { year: 1780, weeks: 2.19 },
  { year: 1785, weeks: 1.83 },
  { year: 1790, weeks: 1.86 },
  { year: 1795, weeks: 2.76 },
  { year: 1800, weeks: 2.77 },
  { year: 1805, weeks: 2.75 },
  { year: 1810, weeks: 3.3 },
] as const;
