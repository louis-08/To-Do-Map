import { describe, expect, it } from "vitest";
import { descriptionPreview, hasDescription } from "./description";

describe("hasDescription", () => {
  it("is false for missing, null, empty and whitespace-only text", () => {
    expect(hasDescription({})).toBe(false);
    expect(hasDescription({ description: null })).toBe(false);
    expect(hasDescription({ description: "" })).toBe(false);
    expect(hasDescription({ description: " \n\t " })).toBe(false);
  });

  it("is true for any visible text", () => {
    expect(hasDescription({ description: "a" })).toBe(true);
    expect(hasDescription({ description: "  a  " })).toBe(true);
  });
});

describe("descriptionPreview", () => {
  it("trims and keeps short text intact", () => {
    expect(descriptionPreview("  hello\nworld \n")).toBe("hello\nworld");
  });

  it("cuts long text at the limit and appends an ellipsis", () => {
    const out = descriptionPreview("x".repeat(500), 100);
    expect(out).toBe("x".repeat(100) + "…");
  });

  it("does not add an ellipsis at exactly the limit", () => {
    expect(descriptionPreview("x".repeat(100), 100)).toBe("x".repeat(100));
  });
});
