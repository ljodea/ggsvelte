/**
 * William Farr's tabulation of the 1849 cholera epidemic across 38 London
 * districts, prepared for the Registrar-General. Farr collected density, water
 * supply, elevation and mortality together, five years before John Snow used
 * the same kind of evidence to argue cholera travelled in water.
 *
 * Population density spans two orders of magnitude (2 to 284 people per acre),
 * which is what makes the log axis do real work here.
 *
 * Farr, "Report on the Mortality of Cholera in England 1848-49" (1852).
 * Transcribed from HistData::Cholera (see NOTICE); 38 rows.
 */
export const londonCholera = [
  { district: "Newington", density: 101, deathRate: 144, water: "Battersea" },
  { district: "Rotherhithe", density: 19, deathRate: 205, water: "Battersea" },
  { district: "Bermondsey", density: 180, deathRate: 164, water: "Battersea" },
  { district: "St George Southwark", density: 66, deathRate: 161, water: "Battersea" },
  { district: "St Olave", density: 114, deathRate: 181, water: "Battersea" },
  { district: "St Saviour", density: 141, deathRate: 153, water: "Battersea" },
  { district: "Westminster", density: 70, deathRate: 68, water: "Battersea" },
  { district: "Lambeth", density: 34, deathRate: 120, water: "Battersea" },
  { district: "Camberwell", density: 12, deathRate: 97, water: "Battersea" },
  { district: "Greenwich", density: 18, deathRate: 75, water: "New River" },
  { district: "Poplar", density: 15, deathRate: 71, water: "New River" },
  { district: "Chelsea", density: 62, deathRate: 46, water: "Battersea" },
  {
    district: "Hammersmith, Brompton, Kensington and Fulham",
    density: 11,
    deathRate: 33,
    water: "Kew",
  },
  { district: "St George East", density: 195, deathRate: 42, water: "New River" },
  { district: "Stepney", density: 85, deathRate: 47, water: "New River" },
  { district: "Belgrave", density: 65, deathRate: 28, water: "Battersea" },
  { district: "Wandsworth", density: 4, deathRate: 100, water: "Battersea" },
  { district: "West London", density: 212, deathRate: 96, water: "New River" },
  { district: "Whitechapel", density: 194, deathRate: 64, water: "New River" },
  { district: "Lewisham", density: 2, deathRate: 30, water: "New River" },
  { district: "St Martin-in-the-Fields", density: 81, deathRate: 37, water: "New River" },
  { district: "Bethnal Green", density: 115, deathRate: 90, water: "New River" },
  { district: "London City", density: 129, deathRate: 38, water: "New River" },
  { district: "East London", density: 284, deathRate: 45, water: "New River" },
  { district: "St James Westminster", density: 222, deathRate: 16, water: "Kew" },
  { district: "Shoreditch", density: 161, deathRate: 76, water: "New River" },
  { district: "St Luke", density: 242, deathRate: 34, water: "New River" },
  { district: "Hanover Square & Mayfair", density: 57, deathRate: 8, water: "Kew" },
  { district: "Strand", density: 254, deathRate: 35, water: "New River" },
  { district: "Holborn", density: 235, deathRate: 35, water: "New River" },
  { district: "Hackney", density: 14, deathRate: 25, water: "New River" },
  { district: "Clerkenwell", density: 202, deathRate: 19, water: "New River" },
  { district: "St Giles", density: 221, deathRate: 53, water: "New River" },
  { district: "Paddington", density: 32, deathRate: 8, water: "Kew" },
  { district: "St Pancras", density: 59, deathRate: 22, water: "New River" },
  { district: "Islington", density: 28, deathRate: 22, water: "New River" },
  { district: "Marylebone", density: 102, deathRate: 17, water: "Kew" },
  { district: "Hampstead", density: 5, deathRate: 8, water: "Kew" },
] as const;
