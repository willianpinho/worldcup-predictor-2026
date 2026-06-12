import { describe, expect, it } from "vitest";
import { hasApiErrors } from "./apiFootball";

describe("hasApiErrors", () => {
  it("treats the success sentinel (empty array) as no error", () => {
    expect(hasApiErrors([])).toBe(false);
  });

  it("flags a populated errors object as an error", () => {
    // The exact shape returned for a bad/absent application key.
    expect(hasApiErrors({ token: "Error/Missing application key." })).toBe(
      true,
    );
  });

  it("flags a non-empty errors array as an error", () => {
    expect(hasApiErrors(["rate limit reached"])).toBe(true);
  });

  it("treats null/undefined as no error", () => {
    expect(hasApiErrors(null)).toBe(false);
    expect(hasApiErrors(undefined)).toBe(false);
  });

  it("flags a bare error string", () => {
    expect(hasApiErrors("Bad request")).toBe(true);
  });
});
