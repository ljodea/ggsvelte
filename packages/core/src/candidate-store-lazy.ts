import { primitiveCount } from "./candidate-geometry.js";
import { buildCandidateStoreEager, EMPTY_FLOAT32, EMPTY_UINT32 } from "./candidate-store-eager.js";
import type {
  CandidateFacts,
  CandidateGroup,
  CandidateInspectMode,
  CandidateMatch,
  CandidateStore,
  CandidateStoreOptions,
  TraversalDirection,
} from "./candidate-store-types.js";
import type { Scene } from "./scene.js";

/**
 * Shared compact candidate storage. Anchors and integer metadata are retained
 * in typed arrays; rich CandidateFacts objects are materialized only on demand.
 */
export function buildCandidateStore(
  scene: Scene,
  options: CandidateStoreOptions = {},
): CandidateStore {
  return new LazyCandidateStore(scene, options);
}

class LazyCandidateStore implements CandidateStore {
  readonly epoch: number;
  #size: number;
  #scene: Scene | null;
  #options: CandidateStoreOptions | null;
  #initialized: CandidateStore | null = null;

  constructor(scene: Scene, options: CandidateStoreOptions) {
    this.#scene = scene;
    this.#options = options;
    this.epoch = options.epoch ?? 0;
    let size = 0;
    for (const batch of scene.batches) {
      if (scene.panels[batch.panelIndex] !== undefined) size += primitiveCount(batch);
    }
    this.#size = size;
  }

  get size(): number {
    return this.#size;
  }

  #ready(): CandidateStore | null {
    if (this.#scene === null || this.#options === null) return null;
    this.#initialized ??= buildCandidateStoreEager(this.#scene, this.#options);
    return this.#initialized;
  }

  get x(): Float32Array {
    return this.#ready()?.x ?? EMPTY_FLOAT32;
  }

  get y(): Float32Array {
    return this.#ready()?.y ?? EMPTY_FLOAT32;
  }

  candidate(id: number): CandidateFacts | null {
    return this.#ready()?.candidate(id) ?? null;
  }

  hitTest(x: number, y: number): CandidateFacts | null {
    return this.#ready()?.hitTest(x, y) ?? null;
  }

  nearest(
    x: number,
    y: number,
    options: { mode: CandidateInspectMode; maxDistance: number; panelId?: string },
  ): CandidateMatch | null {
    return this.#ready()?.nearest(x, y, options) ?? null;
  }

  group(seedId: number, axis: "x" | "y"): CandidateGroup | null {
    return this.#ready()?.group(seedId, axis) ?? null;
  }

  traverse(startId: number | null, direction?: TraversalDirection): number | null {
    return this.#ready()?.traverse(startId, direction) ?? null;
  }

  cycle(seedId: number, step?: number): number | null {
    return this.#ready()?.cycle(seedId, step) ?? null;
  }

  queryRect(x0: number, y0: number, x1: number, y1: number, panelId?: string): Uint32Array {
    return this.#ready()?.queryRect(x0, y0, x1, y1, panelId) ?? EMPTY_UINT32;
  }

  dispose(): void {
    this.#initialized?.dispose();
    this.#initialized = null;
    this.#scene = null;
    this.#options = null;
    this.#size = 0;
  }
}
