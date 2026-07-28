/**
 * William Farr's tabulation of the 1849 cholera epidemic across 38 London
 * districts, prepared for the Registrar-General. Farr's argument was that
 * mortality fell with elevation above the Thames, and on these numbers it
 * plainly does - though the poorest districts are also the lowest ones, which
 * is why the poor rate is worth carrying alongside.
 *
 * Transcribed from HistData::Cholera (see NOTICE); 38 districts. `elevation`
 * is feet above the high-water mark (Rotherhithe and three others sit at or
 * below it), `deathRate` is cholera deaths per 10,000 people, and `poorRate`
 * is the share of the district's property value levied for poor relief.
 */
export const londonDistricts: {
  district: string;
  elevation: number;
  deathRate: number;
  poorRate: number;
}[] = [
  { district: "Newington", elevation: -2, deathRate: 144, poorRate: 0.075 },
  { district: "Rotherhithe", elevation: 0, deathRate: 205, poorRate: 0.143 },
  { district: "Bermondsey", elevation: 0, deathRate: 164, poorRate: 0.089 },
  { district: "St George Southwark", elevation: 0, deathRate: 161, poorRate: 0.134 },
  { district: "St Olave", elevation: 2, deathRate: 181, poorRate: 0.079 },
  { district: "St Saviour", elevation: 2, deathRate: 153, poorRate: 0.076 },
  { district: "Westminster", elevation: 2, deathRate: 68, poorRate: 0.039 },
  { district: "Lambeth", elevation: 3, deathRate: 120, poorRate: 0.072 },
  { district: "Camberwell", elevation: 4, deathRate: 97, poorRate: 0.038 },
  { district: "Greenwich", elevation: 8, deathRate: 75, poorRate: 0.081 },
  { district: "Poplar", elevation: 10, deathRate: 71, poorRate: 0.06 },
  { district: "Chelsea", elevation: 12, deathRate: 46, poorRate: 0.067 },
  {
    district: "Hammersmith, Brompton, Kensington and Fulham",
    elevation: 12,
    deathRate: 33,
    poorRate: 0.039,
  },
  { district: "St George East", elevation: 15, deathRate: 42, poorRate: 0.08 },
  { district: "Stepney", elevation: 16, deathRate: 47, poorRate: 0.066 },
  { district: "Belgrave", elevation: 19, deathRate: 28, poorRate: 0.018 },
  { district: "Wandsworth", elevation: 22, deathRate: 100, poorRate: 0.072 },
  { district: "West London", elevation: 28, deathRate: 96, poorRate: 0.067 },
  { district: "Whitechapel", elevation: 28, deathRate: 64, poorRate: 0.075 },
  { district: "Lewisham", elevation: 28, deathRate: 30, poorRate: 0.049 },
  { district: "St Martin-in-the-Fields", elevation: 35, deathRate: 37, poorRate: 0.039 },
  { district: "Bethnal Green", elevation: 36, deathRate: 90, poorRate: 0.136 },
  { district: "London City", elevation: 38, deathRate: 38, poorRate: 0.056 },
  { district: "East London", elevation: 42, deathRate: 45, poorRate: 0.088 },
  { district: "St James Westminster", elevation: 43, deathRate: 16, poorRate: 0.023 },
  { district: "Shoreditch", elevation: 48, deathRate: 76, poorRate: 0.082 },
  { district: "St Luke", elevation: 48, deathRate: 34, poorRate: 0.081 },
  { district: "Hanover Square & Mayfair", elevation: 49, deathRate: 8, poorRate: 0.018 },
  { district: "Strand", elevation: 50, deathRate: 35, poorRate: 0.047 },
  { district: "Holborn", elevation: 53, deathRate: 35, poorRate: 0.034 },
  { district: "Hackney", elevation: 55, deathRate: 25, poorRate: 0.074 },
  { district: "Clerkenwell", elevation: 63, deathRate: 19, poorRate: 0.057 },
  { district: "St Giles", elevation: 68, deathRate: 53, poorRate: 0.052 },
  { district: "Paddington", elevation: 76, deathRate: 8, poorRate: 0.039 },
  { district: "St Pancras", elevation: 80, deathRate: 22, poorRate: 0.042 },
  { district: "Islington", elevation: 88, deathRate: 22, poorRate: 0.03 },
  { district: "Marylebone", elevation: 100, deathRate: 17, poorRate: 0.043 },
  { district: "Hampstead", elevation: 350, deathRate: 8, poorRate: 0.045 },
];
