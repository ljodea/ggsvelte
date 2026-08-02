/**
 * Explicit registration API (#1420).
 *
 * Seam A (in-process): `registerAll` / `registerBasic` are exported from the
 * package barrel and are idempotent. (In-process negative assertions are
 * impossible here — bunfig.toml preload registers the full grammar for the
 * whole test process.)
 *
 * Seam B (fresh process): a bare `@ggsvelte/core` import registers NOTHING;
 * unregistered geom/stat errors point at registerAll()/registerBasic();
 * registerBasic() unlocks identity charts only; registerAll() unlocks the
 * full grammar (and Temporal).
 */
import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { registerAll, registerBasic } from "../src/index.ts";

describe("explicit registration API (Seam A)", () => {
  it("exports registerAll + registerBasic as idempotent functions", () => {
    expect(typeof registerAll).toBe("function");
    expect(typeof registerBasic).toBe("function");
    // Preload already registered everything; re-calling must not throw.
    expect(() => registerBasic()).not.toThrow();
    expect(() => registerAll()).not.toThrow();
    expect(() => registerAll()).not.toThrow();
  });
});

describe("fresh-process registration gating (Seam B)", () => {
  it("bare import registers nothing; registerBasic/registerAll gate the grammar", () => {
    const coreRoot = path.resolve(import.meta.dir, "..");
    const script = `
      import { registerAll, registerBasic, renderToSVGString } from ${JSON.stringify(
        path.join(coreRoot, "src", "index.ts"),
      )};
      import { aes, gg } from "@ggsvelte/spec";

      const rows = [
        { x: 1, y: 10 }, { x: 2, y: 20 }, { x: 3, y: 15 }, { x: 4, y: 25 }, { x: 5, y: 22 },
      ];
      const point = () =>
        renderToSVGString(gg(rows, aes({ x: "x", y: "y" })).geomPoint(), {
          width: 400, height: 300,
        });
      const smooth = () =>
        renderToSVGString(gg(rows, aes({ x: "x", y: "y" })).geomSmooth(), {
          width: 400, height: 300,
        });

      const attempt = (fn) => {
        try {
          fn();
          return "rendered";
        } catch (err) {
          return String(err instanceof Error ? err.message : err);
        }
      };

      const out = {
        pointFresh: attempt(point),
        smoothFresh: attempt(smooth),
      };
      registerBasic();
      out.pointAfterBasic = attempt(point);
      out.smoothAfterBasic = attempt(smooth);
      registerAll();
      out.smoothAfterAll = attempt(smooth);
      console.log(JSON.stringify(out));
    `;
    const proc = spawnSync(process.execPath, ["-e", script], {
      cwd: coreRoot,
      encoding: "utf8",
    });
    expect(proc.status).toBe(0);
    const out = JSON.parse(proc.stdout.trim().split("\n").at(-1) ?? "{}");

    // Fresh barrel import: nothing registered, and errors guide to the fix.
    expect(out.pointFresh).toContain("not registered");
    expect(out.pointFresh).toContain("registerAll");
    expect(out.smoothFresh).toContain("not registered");

    // registerBasic(): identity charts only.
    expect(out.pointAfterBasic).toBe("rendered");
    expect(out.smoothAfterBasic).toContain("not registered");

    // registerAll(): full grammar.
    expect(out.smoothAfterAll).toBe("rendered");
  }, 60_000);
});
