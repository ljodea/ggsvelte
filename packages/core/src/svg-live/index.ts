/**
 * Live (patchable) SVG rendering (#1471): the incremental update path.
 *
 * `mountSceneSvg` mounts a computed Scene once and returns a handle whose
 * `update(nextScene)` patches the DOM positionally instead of replacing it,
 * so structural identity (element order, classes, theme var() fills) is
 * preserved across updates and the browser skips full style/layout rebuilds.
 *
 * Public API is scene-level (`runScene(spec)` → Scene → mountSceneSvg), the
 * same seam the Svelte adapter and the competitive benchmark adapters use.
 */
export { mountSceneSvg, sceneSignature } from "./live-plot.js";
export type { LiveSvgHandle, LiveSvgOptions } from "./live-plot.js";
