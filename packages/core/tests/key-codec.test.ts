import { describe, expect, test } from "bun:test";
import { decodeKey, encodeKey } from "../src/scales/state.ts";

const roundTrip = (v: unknown) => decodeKey(encodeKey(v));

describe("key codec: round-trips", () => {
  test("plain strings pass through unchanged", () => {
    for (const s of ["a", "", "series A", "null", "undefined", "true", "1", "-0", "NaN"]) {
      expect(encodeKey(s)).toBe(s);
      expect(roundTrip(s)).toBe(s);
    }
  });

  test("strings starting with '@' are escaped and round-trip", () => {
    for (const s of ["@", "@@", "@n:1", "@null", "@undefined", "@d:0", "@@already", "@b:true"]) {
      expect(encodeKey(s)).toBe("@" + s);
      expect(roundTrip(s)).toBe(s);
    }
  });

  test("numbers round-trip", () => {
    for (const n of [
      0,
      1,
      -1,
      1.5,
      -273.15,
      1e21,
      5e-324,
      Number.MAX_SAFE_INTEGER,
      Infinity,
      -Infinity,
    ]) {
      expect(roundTrip(n)).toBe(n);
    }
  });

  test("NaN round-trips", () => {
    const back = roundTrip(NaN);
    expect(typeof back).toBe("number");
    expect(Number.isNaN(back)).toBe(true);
  });

  test("-0 round-trips (distinct from +0)", () => {
    expect(Object.is(roundTrip(-0), -0)).toBe(true);
    expect(Object.is(roundTrip(0), 0)).toBe(true);
    expect(encodeKey(-0)).not.toBe(encodeKey(0));
  });

  test("booleans round-trip", () => {
    expect(roundTrip(true)).toBe(true);
    expect(roundTrip(false)).toBe(false);
  });

  test("null and undefined round-trip", () => {
    expect(roundTrip(null)).toBe(null);
    expect(roundTrip()).toBe(undefined);
  });

  test("dates round-trip by epoch millis", () => {
    const d = new Date("2026-07-10T12:34:56.789Z");
    const back = roundTrip(d) as Date;
    expect(back).toBeInstanceOf(Date);
    expect(back.getTime()).toBe(d.getTime());
  });

  test("invalid dates round-trip as invalid dates", () => {
    const back = roundTrip(new Date(NaN)) as Date;
    expect(back).toBeInstanceOf(Date);
    expect(Number.isNaN(back.getTime())).toBe(true);
  });

  test("bigints round-trip", () => {
    expect(roundTrip(123456789012345678901234567890n)).toBe(123456789012345678901234567890n);
  });
});

describe("key codec: no cross-type collisions", () => {
  test("numeric string '1' vs number 1", () => {
    expect(encodeKey("1")).not.toBe(encodeKey(1));
    expect(roundTrip("1")).toBe("1");
    expect(roundTrip(1)).toBe(1);
  });

  test("string 'true' vs boolean true; 'null' vs null; 'NaN' vs NaN", () => {
    expect(encodeKey("true")).not.toBe(encodeKey(true));
    expect(encodeKey("null")).not.toBe(encodeKey(null));
    expect(encodeKey("NaN")).not.toBe(encodeKey(NaN));
  });

  test("user string spelled like a tag never collides with the tagged value", () => {
    expect(encodeKey("@n:1")).not.toBe(encodeKey(1));
    expect(encodeKey("@null")).not.toBe(encodeKey(null));
    expect(encodeKey("@d:0")).not.toBe(encodeKey(new Date(0)));
    expect(roundTrip("@n:1")).toBe("@n:1");
  });

  test("Date vs its epoch number vs its epoch string are three distinct keys", () => {
    const keys = new Set([encodeKey(new Date(0)), encodeKey(0), encodeKey("0")]);
    expect(keys.size).toBe(3);
  });
});

describe("key codec: rejects and malformed input", () => {
  test("plain objects and arrays are rejected with a TypeError", () => {
    expect(() => encodeKey({})).toThrow(TypeError);
    expect(() => encodeKey([1, 2])).toThrow(TypeError);
  });

  test("malformed encoded keys throw on decode", () => {
    expect(() => decodeKey("@x:oops")).toThrow(/Malformed/);
    expect(() => decodeKey("@b:maybe")).toThrow(/Malformed/);
  });
});
