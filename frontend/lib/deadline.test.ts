import { describe, expect, it } from "vitest";
import { deadlineStatus, formatDeadline, parseISODate, todayISO } from "./deadline";

describe("parseISODate", () => {
  it("returns local midnight of the given day", () => {
    const d = parseISODate("2026-12-24");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 11, 24]);
    expect([d.getHours(), d.getMinutes()]).toEqual([0, 0]);
  });
});

describe("deadlineStatus", () => {
  const today = "2026-10-25";

  it("is overdue when the deadline is before today", () => {
    expect(deadlineStatus("2026-10-24", false, today)).toBe("overdue");
    expect(deadlineStatus("2025-12-31", false, today)).toBe("overdue");
  });

  it("is today when the deadline is today", () => {
    expect(deadlineStatus("2026-10-25", false, today)).toBe("today");
  });

  it("is upcoming when the deadline is after today", () => {
    expect(deadlineStatus("2026-10-26", false, today)).toBe("upcoming");
    expect(deadlineStatus("2027-01-01", false, today)).toBe("upcoming");
  });

  it("is always done for finished tasks, even when past due", () => {
    expect(deadlineStatus("2020-01-01", true, today)).toBe("done");
    expect(deadlineStatus("2026-10-25", true, today)).toBe("done");
    expect(deadlineStatus("2030-01-01", true, today)).toBe("done");
  });

  it("compares across month and year boundaries correctly", () => {
    expect(deadlineStatus("2026-09-30", false, "2026-10-01")).toBe("overdue");
    expect(deadlineStatus("2027-01-01", false, "2026-12-31")).toBe("upcoming");
  });
});

describe("formatDeadline", () => {
  const now = new Date(2026, 9, 25);

  it("omits the year within the current year", () => {
    expect(formatDeadline("2026-12-24", "en-US", now)).toBe("Dec 24");
    expect(formatDeadline("2026-12-24", "de-DE", now)).toMatch(/^24\.\s?Dez/);
  });

  it("includes the year for other years", () => {
    expect(formatDeadline("2027-03-05", "en-US", now)).toBe("Mar 5, 2027");
    expect(formatDeadline("2025-03-05", "en-US", now)).toBe("Mar 5, 2025");
  });

  it("does not shift the day for timezones behind UTC", () => {
    // `new Date("2026-12-24")` is UTC midnight and would render as Dec 23 west of UTC.
    expect(formatDeadline("2026-12-24", "en-US", now)).not.toContain("23");
  });
});

describe("todayISO", () => {
  it("zero-pads month and day", () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
