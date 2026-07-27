/**
 * Three vertices for a stepped connect demo: (0,0) → (2,2) → (4,0).
 * stat connect hv inserts horizontal-then-vertical elbows between them.
 * Integers only — byte-stable for gallery previews and playground seeds.
 */
export const stepCorners: { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: 2, y: 2 },
  { x: 4, y: 0 },
];
