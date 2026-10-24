import { describe, it, expect } from "vitest";
import { fitFontSize, sanitizeUser } from "./fit";

const measure = (text: string) => (size: number) => text.length * size * 0.6;

describe("username fitting", () => {
  it("keeps the max size for short names", () => {
    expect(fitFontSize(measure("Bob"), 400, 60, 16)).toBe(60);
  });
  it("shrinks long names to fit the plate width", () => {
    const size = fitFontSize(measure("AVeryVeryLongTwitchUsername25"), 400, 60, 16);
    expect(measure("AVeryVeryLongTwitchUsername25")(size)).toBeLessThanOrEqual(400);
    expect(size).toBeLessThan(60);
  });
  it("falls back to a default name when empty", () => {
    expect(sanitizeUser("  ")).toBe("Wanderer");
  });
});
