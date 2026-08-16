/**
 * Chart tooltip first-appear / last-leave is opacity-only. Tokens live next
 * to the policy module so CSS and policy stay locked together.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

import {
  TOOLTIP_EASE,
  TOOLTIP_MOTION_MS,
} from "../packages/svelte/src/lib/inspection/tooltip-motion.ts";

const ROOT = join(import.meta.dir, "..");
const TOOLTIP = join(ROOT, "packages/svelte/src/lib/inspection/Tooltip.svelte");

function styleBlock(source: string): string {
  const match = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  return match?.[1] ?? "";
}

describe("tooltip motion CSS", () => {
  const css = styleBlock(readFileSync(TOOLTIP, "utf8"));

  it("fades enter and ghost with the locked opacity budget", () => {
    const duration = `${TOOLTIP_MOTION_MS}ms`;
    expect(css).toContain("@starting-style");
    expect(css).toContain(".gg-tooltip-ghost");
    expect(css).toContain(`opacity ${duration} ${TOOLTIP_EASE}`);
    expect(css).toMatch(/data-gg-tooltip-motion=["']enter["']/);
    expect(css).toMatch(/\.gg-tooltip-ghost[^{]*\{[^}]*@starting-style\s*\{\s*opacity:\s*1/s);
  });

  it("does not tween left, top, or scale", () => {
    expect(css).not.toMatch(/transition:[^;]*(left|top)/);
    expect(css).not.toMatch(/scale\(/);
  });

  it("applies forced-colors surface rules to the departing ghost", () => {
    const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
    expect(forced).toMatch(/\.gg-tooltip-ghost/);
  });
});
