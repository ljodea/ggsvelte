import type { PathsBatch } from "../../src/scene.ts";
import { runPipeline } from "../../src/pipeline.ts";

export const size = { width: 640, height: 360 };

export function path(model: ReturnType<typeof runPipeline>): PathsBatch {
  const batch = model.scene.batches.find((candidate) => candidate.kind === "paths");
  if (batch?.kind !== "paths") throw new Error("expected paths batch");
  return batch;
}

export function candidates(model: ReturnType<typeof runPipeline>) {
  return Array.from({ length: model.candidates.size }, (_, id) =>
    model.candidates.candidate(id),
  ).filter((candidate) => candidate !== null);
}
