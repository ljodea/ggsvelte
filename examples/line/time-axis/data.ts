/**
 * Arthur Bowley's series of the total value of British and Irish exports,
 * 1855-1899, from "England's Foreign Trade in the Nineteenth Century" (1903) -
 * the data behind one of the earliest published discussions of smoothing a
 * time series to separate trend from fluctuation.
 *
 * Years are left as raw four-digit strings on purpose: ggsvelte infers their
 * calendar meaning with no preprocessing and no explicit time scale.
 *
 * Transcribed from HistData::Bowley (see NOTICE); 45 rows. Value is in
 * millions of pounds sterling.
 */
export const britishExports = [
  { year: "1855", value: 95.7 },
  { year: "1856", value: 115.8 },
  { year: "1857", value: 122 },
  { year: "1858", value: 116.6 },
  { year: "1859", value: 130.4 },
  { year: "1860", value: 135.9 },
  { year: "1861", value: 125.1 },
  { year: "1862", value: 124 },
  { year: "1863", value: 146.5 },
  { year: "1864", value: 160.4 },
  { year: "1865", value: 165.8 },
  { year: "1866", value: 188.9 },
  { year: "1867", value: 181 },
  { year: "1868", value: 179.7 },
  { year: "1869", value: 190 },
  { year: "1870", value: 199.6 },
  { year: "1871", value: 223.1 },
  { year: "1872", value: 256.3 },
  { year: "1873", value: 255.2 },
  { year: "1874", value: 239.6 },
  { year: "1875", value: 223.5 },
  { year: "1876", value: 200.6 },
  { year: "1877", value: 198.9 },
  { year: "1878", value: 192.8 },
  { year: "1879", value: 191.5 },
  { year: "1880", value: 223.1 },
  { year: "1881", value: 234 },
  { year: "1882", value: 241.5 },
  { year: "1883", value: 239.8 },
  { year: "1884", value: 233 },
  { year: "1885", value: 213.1 },
  { year: "1886", value: 212.7 },
  { year: "1887", value: 221.9 },
  { year: "1888", value: 234.5 },
  { year: "1889", value: 248.9 },
  { year: "1890", value: 263.5 },
  { year: "1891", value: 247.2 },
  { year: "1892", value: 227.1 },
  { year: "1893", value: 218.1 },
  { year: "1894", value: 215.8 },
  { year: "1895", value: 225.9 },
  { year: "1896", value: 240.1 },
  { year: "1897", value: 234.3 },
  { year: "1898", value: 233.4 },
  { year: "1899", value: 255.4 },
] as const;
