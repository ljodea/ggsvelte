import type { Scene } from "../../../src/scene.ts";
import { sceneWithPoints } from "../fixtures.ts";

export function largePointScene(count: number): Scene {
  const cols = Math.ceil(Math.sqrt(count));
  const points: (readonly [number, number])[] = [];
  for (let i = 0; i < count; i++) {
    points.push([(i % cols) * 10, Math.floor(i / cols) * 10]);
  }
  return sceneWithPoints(points);
}
