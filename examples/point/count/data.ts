/**
 * Overplotted scatter: many rows share rounded coordinates.
 */
const raw: { x: number; y: number; species: string }[] = [];
const species = ["setosa", "versicolor", "virginica"] as const;
for (let i = 0; i < 80; i++) {
  const s = species[i % 3]!;
  // Cluster with intentional duplicates for geom_count.
  const baseX = s === "setosa" ? 1 : s === "versicolor" ? 2 : 3;
  const baseY = s === "setosa" ? 1 : s === "versicolor" ? 2 : 1.5;
  raw.push({
    x: baseX + (i % 4) * 0.25,
    y: baseY + ((i * 3) % 5) * 0.2,
    species: s,
  });
  // Extra duplicates
  if (i % 3 === 0) raw.push({ x: baseX, y: baseY, species: s });
}
export const overplotSample = raw;
