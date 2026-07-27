/**
 * Observed scatter plus planned axis endpoints for geom_blank domain expansion.
 * Synthetic demo data for #791 (not a historical source table).
 */
export const plannedRange = [
  { x: 2.1, y: 3.4, x_plan: 0, y_plan: 0 },
  { x: 3.8, y: 5.1, x_plan: 10, y_plan: 10 },
  { x: 5.2, y: 2.7, x_plan: 0, y_plan: 10 },
  { x: 6.4, y: 6.8, x_plan: 10, y_plan: 0 },
  { x: 4.0, y: 4.2, x_plan: 5, y_plan: 5 },
] as const;
