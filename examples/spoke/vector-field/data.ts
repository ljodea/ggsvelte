/**
 * Synthetic 5×5 wind-like vector field for geom_spoke (#810).
 * Angle in radians (0 = +x); radius is magnitude in data units.
 * Not a historical source table.
 */
export const vectorField: {
  x: number;
  y: number;
  angle: number;
  radius: number;
}[] = [];

for (let ix = 0; ix < 5; ix++) {
  for (let iy = 0; iy < 5; iy++) {
    const x = ix;
    const y = iy;
    // Gentle swirl: angle rotates with position; radius grows from center.
    const cx = x - 2;
    const cy = y - 2;
    const angle = Math.atan2(cy, cx) + Math.PI / 2;
    const radius = 0.25 + 0.12 * Math.hypot(cx, cy);
    vectorField.push({ x, y, angle, radius });
  }
}
