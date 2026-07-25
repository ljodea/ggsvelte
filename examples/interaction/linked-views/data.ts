/**
 * The Palmer Archipelago penguins: body measurements for 344 adult foraging
 * penguins of three species, collected by Dr Kristen Gorman at Palmer Station,
 * Antarctica, between 2007 and 2009 as part of the Long Term Ecological
 * Research network. Released by Allison Horst, Alison Hill and Kristen Gorman
 * as the palmerpenguins R package under CC0 (see NOTICE).
 *
 * This example links two plots to a row-per-penguin table, so it takes an
 * evenly spaced sample of five birds per species rather than all 333 - a
 * table of every penguin would be unreadable and is not what is being
 * demonstrated. `id` is stable and unique, which is what the interaction key
 * contract needs.
 */
export const penguins: { id: string; species: string; flipper: number; mass: number }[] = [
  { id: "adelie-001", species: "Adelie", flipper: 181, mass: 3750 },
  { id: "adelie-030", species: "Adelie", flipper: 195, mass: 3325 },
  { id: "adelie-059", species: "Adelie", flipper: 184, mass: 2850 },
  { id: "adelie-088", species: "Adelie", flipper: 186, mass: 4450 },
  { id: "adelie-117", species: "Adelie", flipper: 176, mass: 3450 },
  { id: "chinstrap-001", species: "Chinstrap", flipper: 192, mass: 3500 },
  { id: "chinstrap-014", species: "Chinstrap", flipper: 201, mass: 4050 },
  { id: "chinstrap-027", species: "Chinstrap", flipper: 200, mass: 3400 },
  { id: "chinstrap-040", species: "Chinstrap", flipper: 205, mass: 4500 },
  { id: "chinstrap-053", species: "Chinstrap", flipper: 193, mass: 3600 },
  { id: "gentoo-001", species: "Gentoo", flipper: 211, mass: 4500 },
  { id: "gentoo-024", species: "Gentoo", flipper: 215, mass: 5050 },
  { id: "gentoo-047", species: "Gentoo", flipper: 225, mass: 5400 },
  { id: "gentoo-070", species: "Gentoo", flipper: 221, mass: 5000 },
  { id: "gentoo-093", species: "Gentoo", flipper: 214, mass: 4850 },
];

export type PenguinRow = (typeof penguins)[number];
