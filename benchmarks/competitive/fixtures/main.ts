/**
 * Browser harness API for Playwright:
 *   window.competitiveBench.mount(lib, caseId) -> { ms, markHint }
 *   window.competitiveBench.replace(lib, caseId) -> { ms }  // full remount with fresh data seed
 *   window.competitiveBench.list() -> { libs, cases }
 *   window.competitiveBench.clear()
 *
 * Timing includes one rAF after mount so layout/paint can flush (closer to
 * LightningChart-style "visible on screen" than pure JS-only timers).
 */
import { mountChartJs } from "../adapters/chartjs";
import { mountD3 } from "../adapters/d3";
import { mountEcharts } from "../adapters/echarts";
import { mountGgsvelteCanvas } from "../adapters/ggsvelte-canvas";
import { mountGgsvelteSvg } from "../adapters/ggsvelte-svg";
import { mountUplot } from "../adapters/uplot";
import {
  CASES,
  dataForCase,
  LIBS,
  type LibId,
  type ScenarioCase,
  type ScenarioId,
} from "../scenarios";

type Destroyable = { destroy: () => void };

let liveHandle: Destroyable | null = null;

function caseById(id: string): ScenarioCase {
  const found = CASES.find((c) => c.id === id);
  if (found === undefined) throw new Error(`unknown case ${id}`);
  return found;
}

function destroyLive(): void {
  if (liveHandle !== null) {
    try {
      liveHandle.destroy();
    } catch {
      // ignore teardown errors between samples
    }
    liveHandle = null;
  }
}

async function afterPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function mountSync(
  lib: LibId,
  scenario: ScenarioId,
  data: ReturnType<typeof dataForCase>,
  root: HTMLElement,
): { markHint: number; handle?: Destroyable } {
  switch (lib) {
    case "ggsvelte-svg":
      return mountGgsvelteSvg(scenario, data, root);
    case "ggsvelte-canvas":
      return mountGgsvelteCanvas(scenario, data, root);
    case "d3":
      return mountD3(scenario, data, root);
    case "uplot": {
      const r = mountUplot(scenario, data as never, root);
      return { markHint: r.markHint, handle: r.handle };
    }
    case "chartjs": {
      const r = mountChartJs(scenario, data, root);
      return { markHint: r.markHint, handle: r.handle };
    }
    case "echarts": {
      const r = mountEcharts(scenario, data, root);
      return { markHint: r.markHint, handle: r.handle };
    }
    default:
      throw new Error(
        `lib ${lib} has no browser harness (bundle-only peer — see scenarios.ts LIBS)`,
      );
  }
}

async function mountLib(lib: string, caseId: string): Promise<{ ms: number; markHint: number }> {
  const c = caseById(caseId);
  const meta = LIBS.find((l) => l.id === lib);
  if (meta === undefined) throw new Error(`unknown lib ${lib}`);
  if (!meta.browser) throw new Error(`${lib} is bundle-only in this harness`);
  if (!meta.scenarios.includes(c.scenario)) {
    throw new Error(`${lib} does not support scenario ${c.scenario}`);
  }

  const mountEl = document.querySelector("#mount") as HTMLElement;
  const status = document.querySelector("#status") as HTMLElement;
  destroyLive();
  mountEl.replaceChildren();

  const data = dataForCase(c);
  const t0 = performance.now();
  const result = mountSync(lib as LibId, c.scenario, data, mountEl);
  if (result.handle !== undefined) liveHandle = result.handle;
  await afterPaint();
  const ms = performance.now() - t0;
  status.textContent = `${lib} ${caseId} mount=${ms.toFixed(2)}ms marks≈${result.markHint}`;
  return { ms, markHint: result.markHint };
}

/** Full remount with the same case (data re-generated). Not an in-place setData. */
async function replaceLib(lib: string, caseId: string): Promise<{ ms: number }> {
  const result = await mountLib(lib, caseId);
  return { ms: result.ms };
}

function clearMount(): void {
  destroyLive();
  document.querySelector("#mount")?.replaceChildren();
}

function listCatalog(): {
  libs: { id: string; browser: boolean; scenarios: string[] }[];
  cases: { id: string; scenario: string; n: number; defaultBrowser: boolean }[];
} {
  return {
    libs: LIBS.map((l) => ({
      id: l.id,
      browser: l.browser,
      scenarios: [...l.scenarios],
    })),
    cases: CASES.map((c) => ({
      id: c.id,
      scenario: c.scenario,
      n: c.n,
      defaultBrowser: c.defaultBrowser,
    })),
  };
}

declare global {
  interface Window {
    competitiveBench: {
      mount: typeof mountLib;
      replace: typeof replaceLib;
      /** @deprecated use replace — kept for older measure-browser callers */
      update: typeof replaceLib;
      clear: typeof clearMount;
      list: typeof listCatalog;
    };
  }
}

window.competitiveBench = {
  mount: mountLib,
  replace: replaceLib,
  update: replaceLib,
  clear: clearMount,
  list: listCatalog,
};
