import { describe, expect, it } from "vitest";
import {
  CONDITION_META,
  CONDITIONS,
  type Condition,
  isCondition,
  parseArm,
} from "./conditions";

describe("isCondition", () => {
  it("accepts the three arms and rejects anything else", () => {
    for (const c of CONDITIONS) expect(isCondition(c)).toBe(true);
    expect(isCondition("nope")).toBe(false);
    expect(isCondition("")).toBe(false);
  });
});

describe("parseArm", () => {
  it("defaults to web for missing/invalid values", () => {
    expect(parseArm(undefined)).toBe("web");
    expect(parseArm("garbage")).toBe("web");
  });

  it("returns a valid arm and reads the first of an array", () => {
    expect(parseArm("baseline")).toBe("baseline");
    expect(parseArm(["enriched", "web"])).toBe("enriched");
  });
});

describe("CONDITION_META", () => {
  it("has label, short, and description for every arm", () => {
    for (const c of CONDITIONS) {
      const meta = CONDITION_META[c as Condition];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.short.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
    }
  });
});
