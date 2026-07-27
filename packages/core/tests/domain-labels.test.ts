/**
 * Scale-domain presentation labels (#841).
 * Colliding band keys must stay distinguishable in guides and bounds UIs.
 */
import { describe, expect, it } from "bun:test";

import { disambiguatedLabels } from "../src/domain-labels.ts";
// legend.ts re-exports the helper so existing deep imports keep working.
import { disambiguatedLabels as fromLegend } from "../src/legend.ts";

describe("disambiguatedLabels", () => {
  it("leaves unique band keys alone", () => {
    expect(disambiguatedLabels(["a", "b", 1])).toEqual(["a", "b", "1"]);
  });

  it("suffixes colliding band keys with value kind", () => {
    expect(disambiguatedLabels(["1", 1])).toEqual(["1 (text)", "1 (number)"]);
  });

  it("qualifies date vs string collisions on the same band key", () => {
    const date = new Date("2020-01-01T00:00:00.000Z");
    // bandKey(Date) is the ISO string; a matching string collides.
    expect(disambiguatedLabels([date, "2020-01-01T00:00:00.000Z"])).toEqual([
      "2020-01-01T00:00:00.000Z (date)",
      "2020-01-01T00:00:00.000Z (text)",
    ]);
  });

  it("stays available from the legend re-export path", () => {
    expect(fromLegend(["1", 1])).toEqual(["1 (text)", "1 (number)"]);
  });
});
