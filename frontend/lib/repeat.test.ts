import { describe, expect, it } from "vitest";
import { canRepeat, describeRepeat, isRepeating, normalizeInterval, sameRule, taskRule } from "./repeat";
import { de, en } from "./i18n";

const day = { scope: "day", is_weekly_objective: false } as const;

describe("canRepeat / isRepeating", () => {
  it("only plain day tasks can repeat", () => {
    expect(canRepeat(day)).toBe(true);
    expect(canRepeat({ scope: "month", is_weekly_objective: false })).toBe(false);
    expect(canRepeat({ scope: "day", is_weekly_objective: true })).toBe(false);
  });

  it("a rule on a task that can no longer repeat is ignored", () => {
    expect(isRepeating({ ...day, repeat_freq: "week" })).toBe(true);
    expect(isRepeating({ scope: "day", is_weekly_objective: true, repeat_freq: "week" })).toBe(false);
    expect(isRepeating({ ...day, repeat_freq: null })).toBe(false);
    expect(isRepeating(day)).toBe(false);
  });
});

describe("taskRule", () => {
  it("is null without a (valid) frequency, so rows from before the migration work", () => {
    expect(taskRule({})).toBeNull();
    expect(taskRule({ repeat_freq: null })).toBeNull();
    // @ts-expect-error unknown frequency from a stale client/DB
    expect(taskRule({ repeat_freq: "hour" })).toBeNull();
  });

  it("fills in the defaults", () => {
    expect(taskRule({ repeat_freq: "week" })).toEqual({ freq: "week", interval: 1, until: null });
    expect(taskRule({ repeat_freq: "month", repeat_interval: 3, repeat_until: "2027-01-01" }))
      .toEqual({ freq: "month", interval: 3, until: "2027-01-01" });
  });
});

describe("normalizeInterval", () => {
  it.each([
    [1, 1], [7, 7], ["12", 12], [2.9, 2], [0, 1], [-4, 1], ["", 1], ["abc", 1], [NaN, 1],
    [undefined, 1], [null, 1], [5000, 999], ["1000", 999],
  ])("%j -> %j", (input, expected) => {
    expect(normalizeInterval(input)).toBe(expected);
  });
});

describe("sameRule", () => {
  it("compares by value, null only equals null", () => {
    const r = { freq: "day", interval: 1, until: null } as const;
    expect(sameRule(r, { ...r })).toBe(true);
    expect(sameRule(r, { ...r, interval: 2 })).toBe(false);
    expect(sameRule(r, { ...r, until: "2027-01-01" })).toBe(false);
    expect(sameRule(null, null)).toBe(true);
    expect(sameRule(r, null)).toBe(false);
    expect(sameRule(null, r)).toBe(false);
  });
});

describe("describeRepeat", () => {
  const now = new Date(2026, 9, 25);
  it("uses the singular form for interval 1 and the plural otherwise", () => {
    expect(describeRepeat({ freq: "week", interval: 1, until: null }, en, "en-US", now)).toBe("Every week");
    expect(describeRepeat({ freq: "week", interval: 2, until: null }, en, "en-US", now)).toBe("Every 2 weeks");
    expect(describeRepeat({ freq: "year", interval: 1, until: null }, de, "de-DE", now)).toBe("Jedes Jahr");
    expect(describeRepeat({ freq: "day", interval: 3, until: null }, de, "de-DE", now)).toBe("Alle 3 Tage");
  });

  it("appends the end date", () => {
    const text = describeRepeat({ freq: "month", interval: 1, until: "2026-12-24" }, en, "en-US", now);
    expect(text).toMatch(/^Every month, until Dec 24$/);
  });
});
