/**
 * Singleton mount-lifecycle state for the competitive benchmark harness.
 * `liveHandle` and `updateSlot` are declared ONLY here so every harness API
 * (mount, update, clear, endUpdate) shares one teardown path.
 */
import { CASES, type ScenarioCase, type UpdateColumns } from "../scenarios";

export type MountHandle = {
  destroy: () => void;
  update?: (data: UpdateColumns) => void;
};

export type UpdateSlot = {
  key: string;
  caseData: UpdateColumns;
  calls: number;
  handle: MountHandle & { update: (data: UpdateColumns) => void };
};

let liveHandle: MountHandle | null = null;
let updateSlot: UpdateSlot | null = null;

/** Track the handle returned by the last mount so any later cell switch can
 * tear it down; a no-op when the adapter returned no handle. */
export function trackLiveHandle(handle: MountHandle | undefined): void {
  if (handle !== undefined) liveHandle = handle;
}

/** Return the live update slot for a `(lib, caseId)` cell. On a cell change
 * (or first use) the previous slot and live mount are torn down and a fresh
 * slot is installed via `mount` — the UNTIMED mount that establishes the
 * handle the cell updates in place. */
export function ensureUpdateSlot(key: string, mount: () => UpdateSlot): UpdateSlot {
  if (updateSlot === null || updateSlot.key !== key) {
    endUpdate();
    destroyLive();
    updateSlot = mount();
  }
  return updateSlot;
}

export function caseById(id: string): ScenarioCase {
  const found = CASES.find((c) => c.id === id);
  if (found === undefined) throw new Error(`unknown case ${id}`);
  return found;
}

export function destroyLive(): void {
  if (liveHandle !== null) {
    try {
      liveHandle.destroy();
    } catch {
      // ignore teardown errors between samples
    }
    liveHandle = null;
  }
}

/** Teardown the live update cell (called by the harness after the last sample
 * of a cell; also automatic on any cell switch / mount / replace). */
export function endUpdate(): void {
  if (updateSlot !== null) {
    try {
      updateSlot.handle.destroy();
    } catch {
      // ignore teardown errors between cells
    }
    updateSlot = null;
  }
}

export function clearMount(): void {
  endUpdate();
  destroyLive();
  document.querySelector("#mount")?.replaceChildren();
}

export async function afterPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
