/**
 * Gate G2 — the bundled teaching datasets under `@ggsvelte/svelte/data` are
 * real, intact, and cover the guide shapes: time series (kyotoSakura),
 * categorical comparison (mpg), and continuous distribution + groups
 * (palmerPenguins). Each assertion pins the docs static JSON asset to the
 * package export so headless agents and human imports cannot drift.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "bun:test";

import {
  KYOTO_SAKURA_CITATION,
  MPG_CITATION,
  PALMER_PENGUINS_CITATION,
  kyotoSakura,
  mpg,
  palmerPenguins,
  type KyotoSakuraRow,
  type MpgRow,
  type PalmerPenguinRow,
} from "../packages/svelte/src/lib/data/index.ts";

const STATIC = new URL("../apps/docs/static/", import.meta.url).pathname;
const NOTICE = readFileSync(new URL("../NOTICE", import.meta.url).pathname, "utf8");

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

function median(values: readonly number[]): number {
  const sorted = [...values].toSorted((a, b) => a - b);
  expect(sorted.length).toBeGreaterThan(0);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function mean(values: readonly number[]): number {
  expect(values.length).toBeGreaterThan(0);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
    expect(NOTICE).toContain("Yasuyuki Aono");
    expect(NOTICE).toContain("kyophenotemp4");
  });

  it("keeps the docs static asset identical to the package export", () => {
    const asset = JSON.parse(
      readFileSync(`${STATIC}kyoto-sakura.json`, "utf8"),
    ) as KyotoSakuraRow[];
    expect(asset).toEqual(kyotoSakura as KyotoSakuraRow[]);
  });
});

describe("palmerPenguins dataset", () => {
  it("is the complete-cases Palmer table in source order", () => {
    expect(palmerPenguins).toHaveLength(333);
    expect(palmerPenguins[0]).toMatchObject({
      id: "adelie-001",
      species: "Adelie",
      island: "Torgersen",
      billLengthMm: 39.1,
      bodyMassG: 3750,
    });
    expect(palmerPenguins.at(-1)).toMatchObject({
      id: "chinstrap-068",
      species: "Chinstrap",
      island: "Dream",
    });
    const species = new Map<string, number>();
    for (const row of palmerPenguins) {
      species.set(row.species, (species.get(row.species) ?? 0) + 1);
    }
    expect(Object.fromEntries(species)).toEqual({
      Adelie: 146,
      Gentoo: 119,
      Chinstrap: 68,
    });
  });

  it("keeps every row internally consistent", () => {
    const ids = new Set<string>();
    for (const row of palmerPenguins) {
      expect(ids.has(row.id)).toBe(false);
      ids.add(row.id);
      expect(["Adelie", "Chinstrap", "Gentoo"]).toContain(row.species);
      expect(["Biscoe", "Dream", "Torgersen"]).toContain(row.island);
      expect(["male", "female"]).toContain(row.sex);
      expect([2007, 2008, 2009]).toContain(row.year);
      expect(row.billLengthMm).toBeGreaterThan(30);
      expect(row.billLengthMm).toBeLessThan(60);
      expect(row.billDepthMm).toBeGreaterThan(12);
      expect(row.billDepthMm).toBeLessThan(22);
      expect(row.flipperLengthMm).toBeGreaterThan(160);
      expect(row.flipperLengthMm).toBeLessThan(240);
      expect(row.bodyMassG).toBeGreaterThan(2500);
      expect(row.bodyMassG).toBeLessThan(6500);
    }
    expect(ids.size).toBe(333);
  });

  it("carries the species body-mass separation the guide uses", () => {
    // Gentoo is the heavy species; Adelie and Chinstrap overlap much more.
    const adelie = palmerPenguins
      .filter((row) => row.species === "Adelie")
      .map((row) => row.bodyMassG);
    const gentoo = palmerPenguins
      .filter((row) => row.species === "Gentoo")
      .map((row) => row.bodyMassG);
    expect(median(adelie)).toBe(3700);
    expect(median(gentoo)).toBe(5050);
    expect(median(gentoo) - median(adelie)).toBeGreaterThanOrEqual(1000);
  });

  it("names its source", () => {
    expect(PALMER_PENGUINS_CITATION).toContain("Horst");
    expect(PALMER_PENGUINS_CITATION).toContain("CC0");
    expect(PALMER_PENGUINS_CITATION).toContain("Gorman");
    expect(NOTICE).toContain("palmerpenguins");
    expect(NOTICE).toContain("palmer-penguins.ts");
    expect(NOTICE).toContain("CC0");
  });

  it("keeps the docs static asset identical to the package export", () => {
    const asset = JSON.parse(
      readFileSync(`${STATIC}palmer-penguins.json`, "utf8"),
    ) as PalmerPenguinRow[];
    expect(asset).toEqual(palmerPenguins as PalmerPenguinRow[]);
  });
});

describe("mpg dataset", () => {
  it("is the 234-row popular-model EPA subset", () => {
    expect(mpg).toHaveLength(234);
    expect(mpg[0]).toMatchObject({
      manufacturer: "audi",
      model: "a4",
      displ: 1.8,
      year: 1999,
      class: "compact",
    });
    expect(mpg.at(-1)).toMatchObject({
      manufacturer: "volkswagen",
      model: "passat",
      year: 2008,
      class: "midsize",
    });
    expect(mpg.filter((row) => row.year === 1999)).toHaveLength(117);
    expect(mpg.filter((row) => row.year === 2008)).toHaveLength(117);
  });

  it("keeps every row internally consistent", () => {
    const classes = new Set([
      "2seater",
      "compact",
      "midsize",
      "minivan",
      "pickup",
      "subcompact",
      "suv",
    ]);
    for (const row of mpg) {
      expect(row.manufacturer.length).toBeGreaterThan(0);
      expect(row.model.length).toBeGreaterThan(0);
      expect(row.displ).toBeGreaterThan(0);
      expect(row.displ).toBeLessThan(8);
      expect([1999, 2008]).toContain(row.year);
      expect([4, 5, 6, 8]).toContain(row.cyl);
      expect(["f", "r", "4"]).toContain(row.drv);
      expect(row.cty).toBeGreaterThan(0);
      expect(row.hwy).toBeGreaterThanOrEqual(row.cty);
      expect(classes.has(row.class)).toBe(true);
      expect(row.fl.length).toBe(1);
    }
  });

  it("carries the class fuel-economy contrast the guide uses", () => {
    // Compacts beat SUVs on highway mpg — the classic categorical comparison.
    const compactHwy = mpg.filter((row) => row.class === "compact").map((row) => row.hwy);
    const suvHwy = mpg.filter((row) => row.class === "suv").map((row) => row.hwy);
    expect(compactHwy).toHaveLength(47);
    expect(suvHwy).toHaveLength(62);
    expect(mean(compactHwy)).toBeGreaterThan(28);
    expect(mean(suvHwy)).toBeLessThan(19);
    expect(mean(compactHwy) - mean(suvHwy)).toBeGreaterThan(8);
  });

  it("names its source", () => {
    expect(MPG_CITATION).toContain("EPA");
    expect(MPG_CITATION).toContain("fueleconomy.gov");
    expect(MPG_CITATION).toContain("ggplot2");
    expect(NOTICE).toContain("fueleconomy.gov");
    expect(NOTICE).toContain("mpg.ts");
  });

  it("keeps the docs static asset identical to the package export", () => {
    const asset = JSON.parse(readFileSync(`${STATIC}mpg.json`, "utf8")) as MpgRow[];
    expect(asset).toEqual(mpg as MpgRow[]);
  });
});
