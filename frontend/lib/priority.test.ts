import { describe, expect, it } from "vitest";
import { PRIORITIES, normalizePriority, priorityCardStyle } from "./priority";

describe("priority", () => {
  it("has exactly three levels with none as the first/default", () => {
    expect(PRIORITIES).toEqual(["none", "medium", "high"]);
  });

  it("normalizes unknown and legacy values to none", () => {
    expect(normalizePriority(undefined)).toBe("none");
    expect(normalizePriority(null)).toBe("none");
    expect(normalizePriority("red")).toBe("none");
    expect(normalizePriority("medium")).toBe("medium");
    expect(normalizePriority("high")).toBe("high");
  });

  it("colours medium yellow, high red, none not at all", () => {
    expect(priorityCardStyle("none")).toBeUndefined();
    expect(priorityCardStyle("medium")).toEqual({
      background: "#fdefce", borderColor: "#e0a00870", boxShadow: "inset 3px 0 0 #e0a008",
    });
    expect(priorityCardStyle("high")).toEqual({
      background: "#fde7e4", borderColor: "#e5604d70", boxShadow: "inset 3px 0 0 #e5604d",
    });
  });
});
