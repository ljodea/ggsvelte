/**
 * William Playfair's wheat-price series from The Commercial and Political Atlas
 * (1821 edition), with the reigns Playfair drew as a band along the top of the
 * same chart. Prices are shillings per quarter, by decade to 1810 and then
 * annually.
 *
 * Transcribed from HistData::Wheat and HistData::Wheat.monarchs (see NOTICE);
 * 53 price observations and 12 reigns. Playfair put the reigns on the chart
 * because his argument was political, not agricultural - which is exactly what
 * background regions are for. Cromwell's Commonwealth is flagged separately in
 * the source and is coloured separately here. `ymin`/`ymax` are layout, not
 * data: the bands span 0 to 105 shillings so they sit behind the whole series,
 * whose observed range is 26 to 99.
 */
export const wheatPrices: { year: number; shillings: number }[] = [
  { year: 1565, shillings: 41 },
  { year: 1570, shillings: 45 },
  { year: 1575, shillings: 42 },
  { year: 1580, shillings: 49 },
  { year: 1585, shillings: 41.5 },
  { year: 1590, shillings: 47 },
  { year: 1595, shillings: 64 },
  { year: 1600, shillings: 27 },
  { year: 1605, shillings: 33 },
  { year: 1610, shillings: 32 },
  { year: 1615, shillings: 33 },
  { year: 1620, shillings: 35 },
  { year: 1625, shillings: 33 },
  { year: 1630, shillings: 45 },
  { year: 1635, shillings: 33 },
  { year: 1640, shillings: 39 },
  { year: 1645, shillings: 53 },
  { year: 1650, shillings: 42 },
  { year: 1655, shillings: 40.5 },
  { year: 1660, shillings: 46.5 },
  { year: 1665, shillings: 32 },
  { year: 1670, shillings: 37 },
  { year: 1675, shillings: 43 },
  { year: 1680, shillings: 35 },
  { year: 1685, shillings: 27 },
  { year: 1690, shillings: 40 },
  { year: 1695, shillings: 50 },
  { year: 1700, shillings: 30 },
  { year: 1705, shillings: 32 },
  { year: 1710, shillings: 44 },
  { year: 1715, shillings: 33 },
  { year: 1720, shillings: 29 },
  { year: 1725, shillings: 39 },
  { year: 1730, shillings: 26 },
  { year: 1735, shillings: 32 },
  { year: 1740, shillings: 27 },
  { year: 1745, shillings: 27.5 },
  { year: 1750, shillings: 31 },
  { year: 1755, shillings: 35.5 },
  { year: 1760, shillings: 31 },
  { year: 1765, shillings: 43 },
  { year: 1770, shillings: 47 },
  { year: 1775, shillings: 44 },
  { year: 1780, shillings: 46 },
  { year: 1785, shillings: 42 },
  { year: 1790, shillings: 47.5 },
  { year: 1795, shillings: 76 },
  { year: 1800, shillings: 79 },
  { year: 1805, shillings: 81 },
  { year: 1810, shillings: 99 },
  { year: 1815, shillings: 78 },
  { year: 1820, shillings: 54 },
  { year: 1821, shillings: 54 },
];
export const reigns: {
  reign: string;
  start: number;
  end: number;
  ymin: number;
  ymax: number;
  rule: string;
}[] = [
  { reign: "Elizabeth", start: 1565, end: 1603, ymin: 0, ymax: 105, rule: "Monarchy" },
  { reign: "James I", start: 1603, end: 1625, ymin: 0, ymax: 105, rule: "Monarchy" },
  { reign: "Charles I", start: 1625, end: 1649, ymin: 0, ymax: 105, rule: "Monarchy" },
  { reign: "Cromwell", start: 1649, end: 1660, ymin: 0, ymax: 105, rule: "Commonwealth" },
  { reign: "Charles II", start: 1660, end: 1685, ymin: 0, ymax: 105, rule: "Monarchy" },
  { reign: "James II", start: 1685, end: 1689, ymin: 0, ymax: 105, rule: "Monarchy" },
  { reign: "W&M", start: 1689, end: 1702, ymin: 0, ymax: 105, rule: "Monarchy" },
  { reign: "Anne", start: 1702, end: 1714, ymin: 0, ymax: 105, rule: "Monarchy" },
  { reign: "George I", start: 1714, end: 1727, ymin: 0, ymax: 105, rule: "Monarchy" },
  { reign: "George II", start: 1727, end: 1760, ymin: 0, ymax: 105, rule: "Monarchy" },
  { reign: "George III", start: 1760, end: 1820, ymin: 0, ymax: 105, rule: "Monarchy" },
  { reign: "George IV", start: 1820, end: 1821, ymin: 0, ymax: 105, rule: "Monarchy" },
];
