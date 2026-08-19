/**
 * Browser harness API for Playwright:
 *   window.competitiveBench.mount(lib, caseId) -> { ms, syncMs, markHint }
 *   window.competitiveBench.replace(lib, caseId) -> { ms }  // full remount with fresh data seed
 *   window.competitiveBench.update(lib, caseId) -> { ms, syncMs } // IN-PLACE update
 *   window.competitiveBench.endUpdate()                    // teardown the live update cell
 *   window.competitiveBench.list() -> { libs, cases }
 *   window.competitiveBench.clear()
 *
 * `ms` is paint-inclusive: after the sync mount we wait for two animation
 * frames so layout/paint can flush (closer to LightningChart-style "visible on
 * screen" than pure JS-only timers). `syncMs` stops when the adapter returns,
 * separating synchronous pipeline/draw work from compositor and host noise.
 *
 * Update axis: the first update(lib, caseId) call for a cell mounts UNTIMED
 * and keeps the handle alive page-side; later calls time handle.update(data)
 * with the same double-rAF pattern. Data alternates between two determinis-
 * tic perturbations of the mount dataset so no lib can no-op on identical
 * input. Switching cells or calling mount()/replace() destroys the live
 * update handle first.
 */
import {
  registerBasicAreas,
  registerBasicBars,
  registerBasicLines,
  registerBasicPoints,
  registerBandGuide,
  registerOrdinalColor,
} from "@ggsvelte/core/headless/register";

import { mountChartJs } from "../adapters/chartjs";
import { mountD3 } from "../adapters/d3";
import { mountEcharts } from "../adapters/echarts";
import { mountGgsvelteCanvas } from "../adapters/ggsvelte-canvas";
import { mountGgsvelteSvg } from "../adapters/ggsvelte-svg";
import { mountLayerCake, mountLayerCakeCanvas } from "../adapters/layercake";
import { mountSveltePlot } from "../adapters/svelteplot";
import { mountTanstackReact } from "../adapters/tanstack-react";
import { mountTanstackSvelte } from "../adapters/tanstack-svelte";
import { mountUnovis } from "../adapters/unovis";
import { mountUplot } from "../adapters/uplot";
import {
  CASES,
  dataForCase,
  LIBS,
  type BarsColumns,
  type LibId,
  type ScenarioCase,
  type ScenarioId,
  type ScatterColumns,
  type SeriesColumns,
} from "../scenarios";

type UpdateColumns = ScatterColumns | SeriesColumns | BarsColumns;

registerBasicPoints();
registerBasicLines();
registerBasicAreas();
registerBasicBars();
registerOrdinalColor();
registerBandGuide();

type MountHandle = {
  destroy: () => void;
  update?: (data: UpdateColumns) => void;
};

let liveHandle: MountHandle | null = null;

type UpdateSlot = {
  key: string;
  caseData: UpdateColumns;
  calls: number;
  handle: MountHandle & { update: (data: UpdateColumns) => void };
};
let updateSlot: UpdateSlot | null = null;

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

/** Teardown the live update cell (called by the harness after the last sample
 * of a cell; also automatic on any cell switch / mount / replace). */
function endUpdate(): void {
  if (updateSlot !== null) {
    try {
      updateSlot.handle.destroy();
    } catch {
      // ignore teardown errors between cells
    }
    updateSlot = null;
  }
}

/** Rotate a trailing numeric label suffix ("series-3" / "stack-1") by shift.
 * Deterministic; the label SET stays identical so per-name color domains and
 * series counts don't change across update variants. */
function rotateLabel(label: string, shift: number, count: number): string {
  const m = /^(.*?)(\d+)$/.exec(label);
  if (m === null || count <= 0) return label;
  const idx = (Number.parseInt(m[2]!, 10) + shift) % count;
  return `${m[1]}${idx}`;
}

/**
 * Deterministic perturbation of the mount dataset for the update scoreboard:
 * same shape/size, different values (y' = y*0.9 + 5*variant), cls/stack
 * labels rotated by the variant. Two variants alternate across successive
 * update calls so no lib can no-op on identical data. Series names for
 * line/area stay stable (uPlot/Chart.js series counts are fixed at mount).
 */
function perturbed(data: UpdateColumns, variant: 1 | 2): UpdateColumns {
  const bump = variant * 5;
  if ("cls" in data) {
    const classes = new Set(data.cls).size;
    return {
      x: data.x,
      y: data.y.map((v) => v * 0.9 + bump),
      cls: data.cls.map((c) => rotateLabel(c, variant, classes)),
    };
  }
  if ("series" in data) {
    return {
      x: data.x,
      y: data.y.map((v) => v * 0.9 + bump),
      series: data.series,
    };
  }
  const stacks = new Set(data.stack).size;
  return {
    category: data.category,
    value: data.value.map((v) => v * 0.9 + bump),
    stack: data.stack.map((s) => rotateLabel(s, variant, stacks)),
  };
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
): { markHint: number; handle?: MountHandle } {
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
    case "svelteplot": {
      const r = mountSveltePlot(scenario, data, root);
      return { markHint: r.markHint, handle: r.handle };
    }
    case "layercake": {
      const r = mountLayerCake(scenario, data, root);
      return { markHint: r.markHint, handle: r.handle };
    }
    case "layercake-canvas": {
      const r = mountLayerCakeCanvas(scenario, data, root);
      return { markHint: r.markHint, handle: r.handle };
    }
    case "unovis": {
      const r = mountUnovis(scenario, data, root);
      return { markHint: r.markHint, handle: r.handle };
    }
    case "tanstack-svelte": {
      const r = mountTanstackSvelte(scenario, data, root);
      return { markHint: r.markHint, handle: r.handle };
    }
    case "tanstack-react": {
      const r = mountTanstackReact(scenario, data, root);
      return { markHint: r.markHint, handle: r.handle };
    }
    default:
      throw new Error(
        `lib ${lib} has no browser harness (bundle-only peer — see scenarios.ts LIBS)`,
      );
  }
}

async function mountLib(
  lib: string,
  caseId: string,
): Promise<{ ms: number; syncMs: number; markHint: number }> {
  const c = caseById(caseId);
  const meta = LIBS.find((l) => l.id === lib);
  if (meta === undefined) throw new Error(`unknown lib ${lib}`);
  if (!meta.browser) throw new Error(`${lib} is bundle-only in this harness`);
  if (!meta.scenarios.includes(c.scenario)) {
    throw new Error(`${lib} does not support scenario ${c.scenario}`);
  }

  const mountEl = document.querySelector("#mount") as HTMLElement;
  const status = document.querySelector("#status") as HTMLElement;
  endUpdate();
  destroyLive();
  mountEl.replaceChildren();

  const data = dataForCase(c);
  const t0 = performance.now();
  const result = mountSync(lib as LibId, c.scenario, data, mountEl);
  const syncMs = performance.now() - t0;
  if (result.handle !== undefined) liveHandle = result.handle;
  await afterPaint();
  const ms = performance.now() - t0;
  status.textContent = `${lib} ${caseId} mount=${ms.toFixed(2)}ms marks≈${result.markHint}`;
  return { ms, syncMs, markHint: result.markHint };
}

/** Full remount with the same case (data re-generated). Not an in-place setData. */
async function replaceLib(lib: string, caseId: string): Promise<{ ms: number }> {
  const result = await mountLib(lib, caseId);
  return { ms: result.ms };
}

/**
 * IN-PLACE update (second scoreboard axis). First call for a (lib, caseId)
 * cell mounts once UNTIMED and keeps the handle alive page-side; subsequent
 * calls time handle.update(variantData) paint-inclusive with the same
 * double-rAF pattern as mount. Data alternates between two deterministic
 * perturbations so no lib can no-op on identical input.
 */
async function updateLib(lib: string, caseId: string): Promise<{ ms: number; syncMs: number }> {
  const key = `${lib}::${caseId}`;
  if (updateSlot === null || updateSlot.key !== key) {
    endUpdate();
    destroyLive();
    const c = caseById(caseId);
    const meta = LIBS.find((l) => l.id === lib);
    if (meta === undefined) throw new Error(`unknown lib ${lib}`);
    if (!meta.browser) throw new Error(`${lib} is bundle-only in this harness`);
    if (!meta.scenarios.includes(c.scenario)) {
      throw new Error(`${lib} does not support scenario ${c.scenario}`);
    }
    const mountEl = document.querySelector("#mount") as HTMLElement;
    mountEl.replaceChildren();
    const data = dataForCase(c);
    // UNTIMED mount — establishes the live handle this cell updates in place.
    const result = mountSync(lib as LibId, c.scenario, data, mountEl);
    const handle = result.handle;
    if (handle === undefined || typeof handle.update !== "function") {
      throw new Error(`${lib} has no in-place update path (update scoreboard)`);
    }
    updateSlot = { key, caseData: data, calls: 0, handle: handle as UpdateSlot["handle"] };
  }
  const slot = updateSlot;
  slot.calls += 1;
  const variant = (slot.calls % 2 === 1 ? 1 : 2) as 1 | 2;
  const next = perturbed(slot.caseData, variant);
  const status = document.querySelector("#status") as HTMLElement;
  const t0 = performance.now();
  slot.handle.update(next);
  const syncMs = performance.now() - t0;
  await afterPaint();
  const ms = performance.now() - t0;
  status.textContent = `${lib} ${caseId} update=${ms.toFixed(2)}ms variant=${variant}`;
  return { ms, syncMs };
}

function clearMount(): void {
  endUpdate();
  destroyLive();
  document.querySelector("#mount")?.replaceChildren();
}

/**
 * Live-SVG parity gate (#1471): update a ggsvelte-svg mount in place twice
 * (both perturbation variants), then compare the patched DOM against a FRESH
 * mount of the same final data. The fresh mount's initial tree comes from
 * sceneToSVGString + innerHTML (the pre-#1471 behavior), so
 * isEqualNode equality means the incremental patcher produces exactly the
 * DOM the full re-render would have produced.
 * Returns the first mismatching node path when unequal.
 */
function parityLiveSvg(caseId: string): { equal: boolean; detail: string } {
  const c = caseById(caseId);
  const data = dataForCase(c);
  const rootA = document.createElement("div");
  const rootB = document.createElement("div");
  const a = mountGgsvelteSvg(c.scenario, data, rootA);
  const finalData = perturbed(data, 2);
  a.handle.update?.(perturbed(data, 1));
  a.handle.update?.(finalData);
  const b = mountGgsvelteSvg(c.scenario, finalData, rootB);
  const elA = rootA.firstElementChild;
  const elB = rootB.firstElementChild;

  const describe = (el: Element): string => {
    const attrs = Array.from(el.attributes)
      .map((at) => `${at.name}=${at.value}`)
      .join(" ");
    return `<${el.tagName} ${attrs}>`;
  };
  const firstDiff = (x: Node, y: Node, path: string): string | null => {
    if (x.nodeType !== y.nodeType) return `${path}: nodeType ${x.nodeType} vs ${y.nodeType}`;
    if (x instanceof Element && y instanceof Element) {
      if (x.tagName !== y.tagName) return `${path}: <${x.tagName}> vs <${y.tagName}>`;
      if (x.attributes.length !== y.attributes.length) {
        return `${path}: attr count ${describe(x)} vs ${describe(y)}`;
      }
      for (const at of Array.from(x.attributes)) {
        const other = y.getAttributeNS(at.namespaceURI, at.localName);
        if (other !== at.value) {
          return `${path}: ${at.name}="${at.value}" vs "${other}" (${describe(y)})`;
        }
      }
    }
    if (x.textContent !== y.textContent && x.childNodes.length === 0) {
      return `${path}: text "${x.textContent}" vs "${y.textContent}"`;
    }
    const xc = Array.from(x.childNodes);
    const yc = Array.from(y.childNodes);
    if (xc.length !== yc.length) {
      return `${path}: children ${xc.length} vs ${yc.length} (${describe(x as Element)})`;
    }
    for (let i = 0; i < xc.length; i++) {
      const d = firstDiff(xc[i]!, yc[i]!, `${path}/${xc[i]!.nodeName}[${i}]`);
      if (d !== null) return d;
    }
    return null;
  };

  let equal = false;
  let detail = "no root element";
  if (elA !== null && elB !== null) {
    equal = elA.isEqualNode(elB);
    detail = equal
      ? "patched DOM identical to fresh render"
      : (firstDiff(elA, elB, "svg") ?? "differs");
  }
  a.handle.destroy();
  b.handle.destroy();
  return { equal, detail };
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
      /** In-place update scoreboard (previously a deprecated replace alias). */
      update: typeof updateLib;
      endUpdate: typeof endUpdate;
      clear: typeof clearMount;
      list: typeof listCatalog;
      /** Live-SVG patcher parity gate (#1471). */
      parityLiveSvg: typeof parityLiveSvg;
    };
  }
}

window.competitiveBench = {
  mount: mountLib,
  replace: replaceLib,
  update: updateLib,
  endUpdate,
  clear: clearMount,
  list: listCatalog,
  parityLiveSvg,
};
