/** Small, deterministic Palmer-penguins-style dataset for linked-view demos. */
export const penguins = [
  { id: "adelie-1", species: "Adelie", flipper: 181, mass: 3750 },
  { id: "adelie-2", species: "Adelie", flipper: 190, mass: 3650 },
  { id: "adelie-3", species: "Adelie", flipper: 198, mass: 4400 },
  { id: "adelie-4", species: "Adelie", flipper: 193, mass: 3450 },
  { id: "chinstrap-1", species: "Chinstrap", flipper: 192, mass: 3500 },
  { id: "chinstrap-2", species: "Chinstrap", flipper: 196, mass: 3900 },
  { id: "chinstrap-3", species: "Chinstrap", flipper: 202, mass: 4150 },
  { id: "chinstrap-4", species: "Chinstrap", flipper: 205, mass: 4300 },
  { id: "gentoo-1", species: "Gentoo", flipper: 211, mass: 4500 },
  { id: "gentoo-2", species: "Gentoo", flipper: 230, mass: 5700 },
  { id: "gentoo-3", species: "Gentoo", flipper: 218, mass: 5700 },
  { id: "gentoo-4", species: "Gentoo", flipper: 215, mass: 5400 },
] as const;

export type PenguinRow = (typeof penguins)[number];
