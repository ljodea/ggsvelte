/** Department × shift staffing intensity. */
export const staffing = [
  { dept: "Ops", shift: "Day", n: 12 },
  { dept: "Ops", shift: "Eve", n: 9 },
  { dept: "Ops", shift: "Night", n: 4 },
  { dept: "Eng", shift: "Day", n: 18 },
  { dept: "Eng", shift: "Eve", n: 11 },
  { dept: "Eng", shift: "Night", n: 3 },
  { dept: "Sales", shift: "Day", n: 14 },
  { dept: "Sales", shift: "Eve", n: 8 },
  { dept: "Sales", shift: "Night", n: 2 },
] as const;
