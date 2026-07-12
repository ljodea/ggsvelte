/** Weekly sign-ups around a product launch (fictional; week 0 = launch). */
export const signups = [
  { week: -6, count: 105 },
  { week: -5, count: 112 },
  { week: -4, count: 108 },
  { week: -3, count: 118 },
  { week: -2, count: 121 },
  { week: -1, count: 117 },
  { week: 0, count: 156 },
  { week: 1, count: 189 },
  { week: 2, count: 203 },
  { week: 3, count: 198 },
  { week: 4, count: 214 },
  { week: 5, count: 226 },
  { week: 6, count: 235 },
] as const;

/** The growth target the team committed to for the launch quarter. */
export const target = 200;
