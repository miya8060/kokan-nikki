import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names with a single space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values from conditional class chains", () => {
    expect(cn("base", false, null, undefined, "active")).toBe("base active");
  });

  it("returns an empty string when nothing is truthy", () => {
    expect(cn(false, null, undefined)).toBe("");
    expect(cn()).toBe("");
  });
});
