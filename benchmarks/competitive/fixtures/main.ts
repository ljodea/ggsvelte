/**
 * Browser harness API for Playwright:
 *   window.competitiveBench.mount(lib, caseId) -> { ms, syncMs, markHint }
 *   window.competitiveBench.replace(lib, caseId) -> { ms }  // full remount with fresh data seed
 *   window.competitiveBench.update(lib, caseId) -> { ms, syncMs } // IN-PLACE update
 *   window.competitiveBench.verifyUpdate(lib, caseId)             // mutation + fresh parity
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
  perturbForUpdate,
  type BarsColumns,
  type LibId,
  type ScenarioCase,
  type ScenarioId,
  type ScatterColumns,
  type SeriesColumns,
  type UpdateColumns,
} from "../scenarios";

const ggplotAdapter = new URLSearchParams(location.search).has("ggplot")
  ? await import("../adapters/ggsvelte-ggplot")
  : null;

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
    case "ggsvelte-ggplot": {
      if (ggplotAdapter === null) throw new Error("ggsvelte-ggplot is not loaded");
      return ggplotAdapter.mountGgsvelteGgplot(scenario, data as ScatterColumns, root);
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
  if (!meta.browser && !(lib === "ggsvelte-ggplot" && ggplotAdapter !== null)) {
    throw new Error(`${lib} is bundle-only in this harness`);
  }
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
    if (!meta.browser && !(lib === "ggsvelte-ggplot" && ggplotAdapter !== null)) {
      throw new Error(`${lib} is bundle-only in this harness`);
    }
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
  const next = perturbForUpdate(slot.caseData, variant);
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

type UpdateVerification = {
  equal: boolean;
  detail: string;
  mutated: boolean;
};

function canonicalDom(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  // Transition helpers can retain stale geometry in zero-opacity exit nodes.
  // They are not visible output and must not make mutation/fresh parity fail.
  for (const el of clone.querySelectorAll<HTMLElement | SVGElement>("[style]")) {
    const style = el.getAttribute("style") ?? "";
    if (/(?:^|;)\s*opacity\s*:\s*0(?:\s*;|\s*$)/.test(style)) el.remove();
  }
  const ids = new Map<string, string>();
  let nextId = 0;
  for (const el of clone.querySelectorAll("[id]")) {
    const id = el.getAttribute("id");
    if (id !== null) ids.set(id, `__id_${nextId++}__`);
  }
  // Replace longer ids first so `#foo` cannot corrupt a `#foobar` reference.
  const idReplacements = [...ids].sort(([left], [right]) => right.length - left.length);
  for (const el of clone.querySelectorAll("*")) {
    for (const attr of Array.from(el.attributes)) {
      let value = attr.value;
      for (const [id, replacement] of idReplacements) {
        if (attr.name === "id" && value === id) value = replacement;
        value = value.replaceAll(`url(#${id})`, `url(#${replacement})`);
        // Unovis embeds the document URL before the fragment in clip-path
        // styles (`url(http://host/page#generated-id)`). Normalize that form
        // as well as local `url(#generated-id)` references.
        value = value.replaceAll(`#${id}`, `#${replacement}`);
        if ((attr.localName === "href" || attr.name.startsWith("aria-")) && value === `#${id}`) {
          value = `#${replacement}`;
        }
        if (attr.name === "aria-labelledby" || attr.name === "aria-describedby") {
          value = value
            .split(/\s+/)
            .map((token) => (token === id ? replacement : token))
            .join(" ");
        }
      }
      if (value !== attr.value) el.setAttributeNS(attr.namespaceURI, attr.name, value);
    }
  }
  for (const canvas of clone.querySelectorAll("canvas")) canvas.textContent = "";
  return clone.innerHTML;
}

function canvasPixelHash(root: HTMLElement): string {
  let hash = 0x811c9dc5;
  let count = 0;
  for (const canvas of root.querySelectorAll("canvas")) {
    const context = canvas.getContext("2d");
    if (context === null) continue;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    count += 1;
    for (const byte of pixels) {
      hash ^= byte;
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return `${count}:${(hash >>> 0).toString(16)}`;
}

function visibleSnapshot(root: HTMLElement): string {
  const canvas = canvasPixelHash(root);
  return canvas.startsWith("0:") ? canonicalDom(root) : `canvas:${canvas}`;
}

function verificationRoot(): HTMLElement {
  const root = document.createElement("div");
  root.style.cssText =
    "position:fixed;left:-10000px;top:0;width:800px;height:500px;visibility:hidden";
  document.body.appendChild(root);
  return root;
}

/**
 * Update truth gate: the same mounted chart must visibly change between the
 * two benchmark variants, and its final output must equal a fresh mount of
 * the second variant. It uses the benchmark's exact update + double-rAF wait.
 */
async function verifyUpdate(lib: string, caseId: string): Promise<UpdateVerification> {
  const c = caseById(caseId);
  const data = dataForCase(c);
  const first = perturbForUpdate(data, 1);
  const final = perturbForUpdate(data, 2);
  const updatedRoot = verificationRoot();
  const freshRoot = verificationRoot();
  let updated: MountHandle | undefined;
  let fresh: MountHandle | undefined;
  try {
    const mounted = mountSync(lib as LibId, c.scenario, data, updatedRoot);
    updated = mounted.handle;
    if (updated?.update === undefined) {
      return { equal: false, mutated: false, detail: `${lib} has no in-place update path` };
    }
    await afterPaint();
    updated.update(first);
    await afterPaint();
    const firstSnapshot = visibleSnapshot(updatedRoot);
    updated.update(final);
    await afterPaint();
    const finalSnapshot = visibleSnapshot(updatedRoot);
    const freshMounted = mountSync(lib as LibId, c.scenario, final, freshRoot);
    fresh = freshMounted.handle;
    await afterPaint();
    const freshSnapshot = visibleSnapshot(freshRoot);
    const mutated = firstSnapshot !== finalSnapshot;
    const equal = finalSnapshot === freshSnapshot;
    const diffAt = equal
      ? -1
      : Array.from({ length: Math.max(finalSnapshot.length, freshSnapshot.length) }).findIndex(
          (_, index) => finalSnapshot[index] !== freshSnapshot[index],
        );
    const parityDetail =
      diffAt < 0
        ? "updated final output differs from a fresh final-data mount"
        : `updated/fresh differ at ${diffAt}: ${JSON.stringify(finalSnapshot.slice(diffAt, diffAt + 120))} vs ${JSON.stringify(freshSnapshot.slice(diffAt, diffAt + 120))}`;
    return {
      equal: mutated && equal,
      mutated,
      detail: !mutated
        ? "variant 1 and variant 2 produced identical visible output"
        : equal
          ? "updated output changed and equals a fresh final-data mount"
          : parityDetail,
    };
  } finally {
    updated?.destroy();
    fresh?.destroy();
    updatedRoot.remove();
    freshRoot.remove();
  }
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
  const finalData = perturbForUpdate(data, 2);
  a.handle.update?.(perturbForUpdate(data, 1));
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
      browser: l.browser || (l.id === "ggsvelte-ggplot" && ggplotAdapter !== null),
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
      /** Every timed update mutates output and reaches fresh-final parity. */
      verifyUpdate: typeof verifyUpdate;
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
  verifyUpdate,
};
