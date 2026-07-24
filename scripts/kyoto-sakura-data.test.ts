/**
 * Gate G2 — the bundled Kyoto dataset is real, intact, and carries the finding
 * the getting-started lesson claims. These assertions run on the raw data only;
 * the loess fit the page actually draws is asserted separately, against the
 * rendered lesson.
 *
 * Also pins the docs static asset to the package export (E6): headless agents
 * fetch /kyoto-sakura.json, humans import @ggsvelte/svelte/data, and the two
 * must never drift.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "bun:test";

import {
  KYOTO_SAKURA_CITATION,
  kyotoSakura,
  type KyotoSakuraRow,
} from "../packages/svelte/src/lib/data/index.ts";

const ASSET_PATH = new URL("../apps/docs/static/kyoto-sakura.json", import.meta.url).pathname;

const isLeap = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** Median day-of-year over an inclusive year range. */
function medianDoy(from: number, to: number): number {
  const values = kyotoSakura
    .filter((row) => row.year >= from && row.year <= to)
    .map((row) => row.bloomDoy)
    .toSorted((a, b) => a - b);
  expect(values.length).toBeGreaterThan(20);
  return values[Math.floor(values.length / 2)]!;
}

describe("kyotoSakura dataset", () => {
  it("spans the full record in year order with unique years", () => {
    expect(kyotoSakura).toHaveLength(838);
    expect(kyotoSakura[0]!.year).toBe(812);
    expect(kyotoSakura.at(-1)!.year).toBe(2026);
    expect(new Set(kyotoSakura.map((row) => row.year)).size).toBe(kyotoSakura.length);
    for (let i = 1; i < kyotoSakura.length; i += 1) {
      expect(kyotoSakura[i]!.year).toBeGreaterThan(kyotoSakura[i - 1]!.year);
    }
  });

  it("keeps every row internally consistent", () => {
    for (const row of kyotoSakura) {
      expect(row.bloomDate.startsWith(String(row.year).padStart(4, "0"))).toBe(true);
      expect(row.bloomDoy).toBeGreaterThanOrEqual(60);
      expect(row.bloomDoy).toBeLessThanOrEqual(160);
      expect(row.bloomRefDate.startsWith("2001-")).toBe(true);
      // The reference-year projection is the same calendar day as the real
      // observation whenever the observation year is not a leap year.
      if (!isLeap(row.year)) {
        expect(row.bloomRefDate.slice(5)).toBe(row.bloomDate.slice(5));
      }
    }
  });

  it("carries the finding the lesson is built on", () => {
    // Stable near mid-April for a millennium...
    expect(medianDoy(812, 1200)).toBe(104);
    expect(medianDoy(1200, 1600)).toBe(105);
    expect(medianDoy(1600, 1850)).toBe(106);
    // ...then roughly a week earlier once industrial warming arrives.
    expect(medianDoy(1950, 2026)).toBe(98);
    expect(medianDoy(1600, 1850) - medianDoy(1950, 2026)).toBeGreaterThanOrEqual(7);
  });

  it("holds the three records the lesson annotates", () => {
    const byDoy = [...kyotoSakura].toSorted((a, b) => a.bloomDoy - b.bloomDoy);
    const earliest = byDoy[0]!;
    const latest = byDoy.at(-1)!;
    expect(earliest).toMatchObject({ year: 2023, bloomDate: "2023-03-25", bloomDoy: 84 });
    expect(latest).toMatchObject({ year: 1323, bloomDate: "1323-05-04", bloomDoy: 124 });
    // 1409 held the earliest-bloom record for six centuries: nothing observed
    // before 2021 blooms earlier, and both years that beat it are this century.
    const record1409 = kyotoSakura.find((row) => row.year === 1409);
    expect(record1409).toMatchObject({ bloomDate: "1409-03-27", bloomDoy: 86 });
    const beat1409 = kyotoSakura.filter(
      (row) => row.bloomDoy < 86 || (row.bloomDoy === 86 && row.year < 1409),
    );
    expect(beat1409.map((row) => row.year)).toEqual([2021, 2023]);
  });

  it("names its source", () => {
    expect(KYOTO_SAKURA_CITATION).toContain("Aono");
    expect(KYOTO_SAKURA_CITATION).toContain("812");
    expect(KYOTO_SAKURA_CITATION).toContain("2026");
    const notice = readFileSync(new URL("../NOTICE", import.meta.url).pathname, "utf8");
    expect(notice).toContain("Yasuyuki Aono");
    expect(notice).toContain("kyophenotemp4");
  });

  it("keeps the docs static asset identical to the package export", () => {
    const asset = JSON.parse(readFileSync(ASSET_PATH, "utf8")) as KyotoSakuraRow[];
    expect(asset).toEqual(kyotoSakura as KyotoSakuraRow[]);
  });
});
